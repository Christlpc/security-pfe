# Generated manually to seed initial multi-tenant banks, products, and tarification rates
from django.db import migrations
from django.core.management import call_command
from django.conf import settings
import os

def load_initial_data(apps, schema_editor):
    print("🚀 Seeding initial banks and users...")
    try:
        call_command('load_fixtures')
    except Exception as e:
        print(f"⚠️ Warning loading fixtures: {e}")

    # Explicitly populate product relationships and strategies (which were previously skipped)
    print("🚀 Configuring bank product strategies...")
    ProduitBanque = apps.get_model('core', 'ProduitBanque')
    Produit = apps.get_model('core', 'Produit')
    Banque = apps.get_model('core', 'Banque')

    try:
        produit_emprunteur = Produit.objects.get(code='emprunteur')
    except Produit.DoesNotExist:
        produit_emprunteur = None

    if produit_emprunteur:
        STRATEGIES = {
            'BGFI': ('par_annee', 'simple'),
            'BOA': ('par_annee', 'simple'),
            'CHARDEN': ('par_mois', 'simple'),
            'CAPPED': ('par_annee', 'simple'),
            'HOPE': ('fixe', 'annualisee'),
            'ECOBANK': ('fixe', 'annualisee'),
            'CDCO': ('fixe', 'annualisee'),
            'COMIFI': ('fixe', 'annualisee'),
            'COFINCO': ('fixe', 'annualisee'),
            'FINAM': ('fixe', 'annualisee'),
            'BCI': ('par_mois', 'annualisee'),
        }

        BANQUE_PRODUITS = {
            'ECOBANK': ['emprunteur', 'retraite', 'etudes'],
            'BGFI': ['emprunteur', 'retraite', 'epargne_plus'],
            'BCI': ['emprunteur', 'elikia', 'mobateli'],
            'BOA': ['emprunteur', 'mobateli'],
            'CDCO': ['emprunteur', 'retraite'],
            'COMIFI': ['emprunteur', 'mobateli'],
            'COFINCO': ['emprunteur', 'mobateli'],
            'EXPRESS_UNION': ['emprunteur', 'mobateli'],
        }

        for code_banque, codes_produits in BANQUE_PRODUITS.items():
            try:
                banque = Banque.objects.get(code_banque=code_banque)
                for code_prod in codes_produits:
                    try:
                        prod = Produit.objects.get(code=code_prod)
                        ProduitBanque.objects.get_or_create(
                            banque=banque,
                            produit=prod,
                            defaults={'est_actif': True}
                        )
                    except Produit.DoesNotExist:
                        continue
            except Banque.DoesNotExist:
                continue

        for code_banque, (strategie, formule) in STRATEGIES.items():
            try:
                banque = Banque.objects.get(code_banque=code_banque)
                pb, created = ProduitBanque.objects.get_or_create(
                    banque=banque,
                    produit=produit_emprunteur,
                    defaults={'est_actif': True, 'parametres': {}}
                )
                params = pb.parametres or {}
                params['strategie_taux'] = strategie
                params['formule_prime'] = formule
                pb.parametres = params
                pb.save()
            except Banque.DoesNotExist:
                continue

    print("🚀 Seeding tarification rates for emprunteur...")
    try:
        call_command('load_taux_emprunteur')
    except Exception as e:
        print(f"⚠️ Warning loading taux emprunteur: {e}")

    print("🚀 Seeding product parameters...")
    try:
        call_command('load_parametres_produit')
    except Exception as e:
        print(f"⚠️ Warning loading parameters: {e}")

    print("🚀 Seeding CSV rates (CIMA & studies)...")
    cima_h_path = os.path.join(settings.BASE_DIR, 'cima_h.csv')
    primes_path = os.path.join(settings.BASE_DIR, 'primes.csv')
    taux_path = os.path.join(settings.BASE_DIR, 'taux_mensuels.csv')
    cima_f_path = os.path.join(settings.BASE_DIR, 'cima_f.csv')

    args = {
        'cima_h': cima_h_path if os.path.exists(cima_h_path) else None,
        'primes': primes_path if os.path.exists(primes_path) else None,
        'taux': taux_path if os.path.exists(taux_path) else None,
    }
    if os.path.exists(cima_f_path):
        args['cima_f'] = cima_f_path

    try:
        call_command('load_data', **{k: v for k, v in args.items() if v is not None})
        print("✅ Seeding completed successfully!")
    except Exception as e:
        print(f"⚠️ Warning loading CSV data: {e}")

def rollback_initial_data(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0014_enable_row_level_security'),
    ]

    operations = [
        migrations.RunPython(load_initial_data, rollback_initial_data),
    ]
