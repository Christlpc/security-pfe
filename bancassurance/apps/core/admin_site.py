"""
Custom AdminSite pour NSIA Bancassurance
Dashboard avec KPI, tableaux par entreprise, graphiques Chart.js
"""
import json
import logging
from collections import defaultdict
from datetime import timedelta

from django.contrib import admin
from django.contrib.admin import AdminSite
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger(__name__)


class BancassuranceAdminSite(AdminSite):
    site_header = "NSIA Bancassurance"
    site_title = "NSIA Bancassurance"
    index_title = ""

    def get_urls(self):
        from django.urls import path
        from apps.core.admin_views import banque_master_view, banque_master_action

        custom_urls = [
            path(
                'banque-master/',
                self.admin_view(banque_master_view),
                name='banque_master',
            ),
            path(
                'banque-master/action/',
                self.admin_view(banque_master_action),
                name='banque_master_action',
            ),
        ]
        return custom_urls + super().get_urls()

    def index(self, request, extra_context=None):
        from apps.core.models import Banque, Agence, Utilisateur, ProduitBanque, Produit
        from apps.simulateur.models import Simulation

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Valeurs par défaut (résilience)
        total_sims = 0
        brouillon_count = 0
        calculee_count = 0
        validee_count = 0
        convertie_count = 0
        banque_stats = []
        all_day_labels = []
        chart_datasets = {'all': []}
        banque_list = []
        produit_list = []
        is_drilldown = False
        drilldown_banque = None

        # -----------------------------------------------
        # 1. FILTRES (query params)
        # -----------------------------------------------
        filter_date_start = request.GET.get('date_start', '')
        filter_date_end = request.GET.get('date_end', '')
        filter_produit = request.GET.get('produit', '')
        filter_banque_id = request.GET.get('banque', '')

        try:
            # -----------------------------------------------
            # 2. KPI CARDS (filtrés par banque en drill-down)
            # -----------------------------------------------
            base_qs = Simulation.objects.all()
            if filter_banque_id:
                base_qs = base_qs.filter(banque_id=filter_banque_id)
            total_sims = base_qs.count()
            brouillon_count = base_qs.filter(statut='brouillon').count()
            calculee_count = base_qs.filter(statut='calculee').count()
            validee_count = base_qs.filter(statut='validee').count()
            convertie_count = base_qs.filter(statut='convertie').count()
        except Exception as e:
            logger.warning("Dashboard KPI error: %s", e)

        try:
            # -----------------------------------------------
            # 3. STATS PAR BANQUE ou AGENCE (filtrables)
            # -----------------------------------------------
            table_qs = Simulation.objects.all()
            if filter_date_start:
                table_qs = table_qs.filter(date_creation__date__gte=filter_date_start)
            if filter_date_end:
                table_qs = table_qs.filter(date_creation__date__lte=filter_date_end)
            if filter_produit:
                table_qs = table_qs.filter(produit=filter_produit)

            # Mode drill-down par banque → stats par agence
            is_drilldown = bool(filter_banque_id)
            drilldown_banque = None

            if is_drilldown:
                table_qs = table_qs.filter(banque_id=filter_banque_id)
                try:
                    drilldown_banque = Banque.objects.get(id=filter_banque_id)
                except Banque.DoesNotExist:
                    is_drilldown = False

            if is_drilldown:
                # --- Stats par AGENCE (drill-down) ---
                agence_stats_map = {}
                for row in table_qs.values('agence_id').annotate(
                    total=Count('id'),
                    brouillon=Count('id', filter=Q(statut='brouillon')),
                    calculee=Count('id', filter=Q(statut='calculee')),
                    validee=Count('id', filter=Q(statut='validee')),
                    convertie=Count('id', filter=Q(statut='convertie')),
                ):
                    agence_stats_map[row['agence_id']] = row

                # Agences actives de cette banque
                agences = Agence.objects.filter(
                    banque_id=filter_banque_id, active=True
                ).order_by('nom')

                for agence in agences:
                    stats = agence_stats_map.pop(agence.id, {})
                    total = stats.get('total', 0)
                    converted = stats.get('convertie', 0)
                    rate = round((converted / total) * 100, 1) if total > 0 else 0
                    banque_stats.append({
                        'id': str(agence.id),
                        'nom': agence.nom,
                        'total_sims': total,
                        'brouillon': stats.get('brouillon', 0),
                        'calculee': stats.get('calculee', 0),
                        'validee': stats.get('validee', 0),
                        'convertie': converted,
                        'conversion_rate': rate,
                    })

                # Simulations sans agence (agence_id=None encore dans la map)
                sans_agence = agence_stats_map.pop(None, {})
                if sans_agence.get('total', 0) > 0:
                    total_sa = sans_agence['total']
                    conv_sa = sans_agence.get('convertie', 0)
                    banque_stats.append({
                        'id': 'none',
                        'nom': '(Sans agence)',
                        'total_sims': total_sa,
                        'brouillon': sans_agence.get('brouillon', 0),
                        'calculee': sans_agence.get('calculee', 0),
                        'validee': sans_agence.get('validee', 0),
                        'convertie': conv_sa,
                        'conversion_rate': round((conv_sa / total_sa) * 100, 1) if total_sa > 0 else 0,
                    })

                # Agences inactives qui ont quand meme des sims (restant dans la map)
                for agence_id, stats in agence_stats_map.items():
                    if agence_id is None:
                        continue
                    total = stats.get('total', 0)
                    converted = stats.get('convertie', 0)
                    try:
                        ag = Agence.objects.get(id=agence_id)
                        nom = f"{ag.nom} (inactive)"
                    except Agence.DoesNotExist:
                        nom = f"Agence inconnue ({str(agence_id)[:8]})"
                    banque_stats.append({
                        'id': str(agence_id),
                        'nom': nom,
                        'total_sims': total,
                        'brouillon': stats.get('brouillon', 0),
                        'calculee': stats.get('calculee', 0),
                        'validee': stats.get('validee', 0),
                        'convertie': converted,
                        'conversion_rate': round((converted / total) * 100, 1) if total > 0 else 0,
                    })

            else:
                # --- Stats par BANQUE (vue globale) ---
                banques = Banque.objects.filter(statut='ACTIF').order_by('nom_complet')

                banque_stats_map = {}
                for row in table_qs.values('banque_id').annotate(
                    total=Count('id'),
                    brouillon=Count('id', filter=Q(statut='brouillon')),
                    calculee=Count('id', filter=Q(statut='calculee')),
                    validee=Count('id', filter=Q(statut='validee')),
                    convertie=Count('id', filter=Q(statut='convertie')),
                ):
                    banque_stats_map[row['banque_id']] = row

                for banque in banques:
                    stats = banque_stats_map.get(banque.id, {})
                    total = stats.get('total', 0)
                    converted = stats.get('convertie', 0)
                    rate = round((converted / total) * 100, 1) if total > 0 else 0
                    banque_stats.append({
                        'id': str(banque.id),
                        'nom': banque.nom_court or banque.nom_complet,
                        'code': banque.code_banque,
                        'total_sims': total,
                        'brouillon': stats.get('brouillon', 0),
                        'calculee': stats.get('calculee', 0),
                        'validee': stats.get('validee', 0),
                        'convertie': converted,
                        'conversion_rate': rate,
                    })

            # Liste pour les <select> filtre produit (spécifique à la banque en drill-down)
            produit_qs = Simulation.objects.all()
            if filter_banque_id:
                produit_qs = produit_qs.filter(banque_id=filter_banque_id)
            produit_list = list(
                produit_qs
                .values_list('produit', flat=True)
                .distinct()
                .order_by('produit')
            )

            # Liste banques pour le filtre chart (vue globale)
            banque_list = [
                {'id': str(b.id), 'nom': b.nom_court or b.nom_complet}
                for b in Banque.objects.filter(statut='ACTIF').order_by('nom_complet')
            ]

            # -----------------------------------------------
            # 4. CHART : Simulations par jour (30 jours)
            # -----------------------------------------------
            all_days = []
            for i in range(30, -1, -1):
                all_days.append((now - timedelta(days=i)).date())
            all_day_labels = [d.strftime('%d/%m') for d in all_days]

            chart_base_qs = Simulation.objects.filter(
                date_creation__gte=thirty_days_ago,
            )
            if filter_produit:
                chart_base_qs = chart_base_qs.filter(produit=filter_produit)

            if is_drilldown:
                # En drill-down : filtrer par la banque et grouper par agence
                chart_base_qs = chart_base_qs.filter(banque_id=filter_banque_id)

                daily_sims = (
                    chart_base_qs
                    .annotate(day=TruncDate('date_creation'))
                    .values('day', 'agence_id')
                    .annotate(total=Count('id'))
                    .order_by('day')
                )

                chart_all = defaultdict(int)
                chart_per_agence = defaultdict(lambda: defaultdict(int))

                for entry in daily_sims:
                    day_str = entry['day'].strftime('%d/%m')
                    chart_all[day_str] += entry['total']
                    agence_key = str(entry['agence_id']) if entry['agence_id'] else 'none'
                    chart_per_agence[agence_key][day_str] += entry['total']

                chart_datasets = {
                    'all': [chart_all.get(d, 0) for d in all_day_labels]
                }
                # Datasets par agence (pour le filtre du chart)
                for ent in banque_stats:
                    a_data = chart_per_agence.get(ent['id'], {})
                    chart_datasets[ent['id']] = [
                        a_data.get(d, 0) for d in all_day_labels
                    ]

            else:
                # Vue globale : grouper par banque
                daily_sims = (
                    chart_base_qs
                    .annotate(day=TruncDate('date_creation'))
                    .values('day', 'banque_id')
                    .annotate(total=Count('id'))
                    .order_by('day')
                )

                chart_all = defaultdict(int)
                chart_per_banque = defaultdict(lambda: defaultdict(int))

                for entry in daily_sims:
                    day_str = entry['day'].strftime('%d/%m')
                    chart_all[day_str] += entry['total']
                    chart_per_banque[str(entry['banque_id'])][day_str] += entry['total']

                chart_datasets = {
                    'all': [chart_all.get(d, 0) for d in all_day_labels]
                }
                for b_info in banque_list:
                    b_data = chart_per_banque.get(b_info['id'], {})
                    chart_datasets[b_info['id']] = [
                        b_data.get(d, 0) for d in all_day_labels
                    ]

        except Exception as e:
            logger.warning("Dashboard enterprise/chart error: %s", e)
            import traceback
            logger.warning(traceback.format_exc())

        # -----------------------------------------------
        # 5. CONTEXTE FINAL
        # -----------------------------------------------
        extra_context = extra_context or {}
        extra_context.update({
            # KPIs globaux
            'total_sims': total_sims,
            'brouillon_count': brouillon_count,
            'calculee_count': calculee_count,
            'validee_count': validee_count,
            'convertie_count': convertie_count,
            # Tableau entreprises / agences
            'banque_stats': banque_stats,
            'is_drilldown': is_drilldown,
            'drilldown_banque': drilldown_banque,
            # Chart
            # SECURITE : passer les objets Python bruts, json_script dans le template
            # se charge de la sérialisation sécurisée (pas de double encodage)
            'chart_labels': all_day_labels,
            'chart_datasets': chart_datasets,
            'banque_list_json': json.dumps(banque_list),
            # Filtres
            'filter_date_start': filter_date_start,
            'filter_date_end': filter_date_end,
            'filter_produit': filter_produit,
            'filter_banque_id': filter_banque_id,
            'produit_list': produit_list,
            # Timestamp
            'now': now,
        })

        return super().index(request, extra_context=extra_context)


bancassurance_admin_site = BancassuranceAdminSite(name='admin')
