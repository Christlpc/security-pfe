"""
Management command pour charger les fixtures de test
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from apps.core.models import Banque, Utilisateur


class Command(BaseCommand):
    help = 'Charge les fixtures de test (banques et utilisateurs)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Supprime toutes les données existantes avant de charger',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Chargement des fixtures de test...'))
        
        # Flush si demandé
        if options['flush']:
            self.stdout.write(self.style.WARNING('⚠️  Suppression des données existantes...'))
            Utilisateur.objects.filter(is_superuser=False).delete()
            Banque.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Données supprimées'))
        
        # Créer les banques
        self.stdout.write('\n📦 Création des banques...')
        banques_data = [
            {
                'code_banque': 'ECOBANK',
                'nom_complet': 'Ecobank Congo',
                'nom_court': 'Ecobank',
                'couleur_primaire': '#003366',
                'couleur_secondaire': '#FF9900',
                'police_principale': 'Arial',
                'email_contact': 'contact@ecobank.com',
                'telephone_contact': '+242 05 532 50 00',
                'adresse': 'Avenue du Camp BP. 2485, Brazzaville République du Congo',
                'date_partenariat': date(2023, 1, 15),
            },
            {
                'code_banque': 'BGFI',
                'nom_complet': 'BGFI Bank Congo',
                'nom_court': 'BGFI',
                'couleur_primaire': '#00843D',
                'couleur_secondaire': '#FDB913',
                'police_principale': 'Arial',
                'email_contact': 'contact@bgfibank.cg',
                'telephone_contact': '+242 05 555 55 55',
                'adresse': 'Avenue Amilcar Cabral, Brazzaville',
                'date_partenariat': date(2023, 3, 10),
            },
            {
                'code_banque': 'CDCO',
                'nom_complet': 'Crédit du Congo',
                'nom_court': 'CDCO',
                'couleur_primaire': '#1E3A8A',
                'couleur_secondaire': '#F59E0B',
                'police_principale': 'Arial',
                'email_contact': 'contact@creditducongo.cg',
                'telephone_contact': '+242 05 444 44 44',
                'adresse': 'Boulevard Denis Sassou Nguesso, Brazzaville',
                'date_partenariat': date(2023, 2, 20),
            },
            {
                'code_banque': 'BCI',
                'nom_complet': 'Banque Commerciale Internationale',
                'nom_court': 'BCI',
                'couleur_primaire': '#8B0000',
                'couleur_secondaire': '#FFD700',
                'police_principale': 'Arial',
                'email_contact': 'contact@bci-congo.com',
                'telephone_contact': '+242 05 666 66 66',
                'adresse': 'Avenue de la Paix, Brazzaville',
                'date_partenariat': date(2023, 4, 5),
            },
            {
                'code_banque': 'CHARDEN',
                'nom_complet': 'Charden Farell Bank',
                'nom_court': 'Charden',
                'couleur_primaire': '#2C5F2D',
                'couleur_secondaire': '#97BC62',
                'police_principale': 'Arial',
                'email_contact': 'contact@chardenfarell.cg',
                'telephone_contact': '+242 05 777 77 77',
                'adresse': 'Rue Félix Eboué, Brazzaville',
                'date_partenariat': date(2023, 5, 12),
            },
            {
                'code_banque': 'HOPE',
                'nom_complet': 'Hope Congo Bank',
                'nom_court': 'Hope',
                'couleur_primaire': '#0066CC',
                'couleur_secondaire': '#FF6600',
                'police_principale': 'Arial',
                'email_contact': 'contact@hopecongo.cg',
                'telephone_contact': '+242 05 888 88 88',
                'adresse': 'Avenue de la Liberté, Brazzaville',
                'date_partenariat': date(2023, 6, 1),
            },
        ]
        
        banques = {}
        for data in banques_data:
            banque, created = Banque.objects.get_or_create(
                code_banque=data['code_banque'],
                defaults=data
            )
            banques[data['code_banque']] = banque
            status = '✨ Créée' if created else '✓ Existe déjà'
            self.stdout.write(f'  {status}: {banque.nom_complet} ({banque.code_banque})')
        
        # Créer les utilisateurs
        self.stdout.write('\n👤 Création des utilisateurs...')
        
        # Super Admin NSIA
        super_admin, created = Utilisateur.objects.get_or_create(
            username='super_admin',
            defaults={
                'email': 'superadmin@nsia.com',
                'first_name': 'Alfred',
                'last_name': 'YAMEOGO',
                'role': Utilisateur.Role.SUPER_ADMIN,
                'matricule': 'NSIA-SA-001',
                'telephone': '+242 06 000 00 01',
                'is_staff': True,
                'is_superuser': True,
                'password': "1234",
            }
        )
        if created:
            super_admin.set_password('Admin123!')
            super_admin.save()
        self.stdout.write(f'  {"✨ Créé" if created else "✓ Existe"}: Super Admin - {super_admin.username}')
        
        # Admin NSIA
        admin_nsia, created = Utilisateur.objects.get_or_create(
            username='admin_nsia',
            defaults={
                'email': 'admin@nsia.com',
                'first_name': 'Direction',
                'last_name': 'Commerciale',
                'role': Utilisateur.Role.ADMIN_NSIA,
                'matricule': 'NSIA-AD-001',
                'telephone': '+242 06 000 00 02',
                'password': '1234',
                'is_staff': True,
            }
        )
        if created:
            admin_nsia.set_password('Admin123!')
            admin_nsia.save()
        self.stdout.write(f'  {"✨ Créé" if created else "✓ Existe"}: Admin NSIA - {admin_nsia.username}')
        
        # Responsables et Gestionnaires par banque
        responsables_data = [
            ('ECOBANK', 'resp_ecobank', 'Ibrahim', 'BAGARAMA', 'R-ECO-001'),
            ('BGFI', 'resp_bgfi', 'Marie', 'OKEMBA', 'R-BGF-001'),
            ('CDCO', 'resp_cdco', 'Jean', 'MOUKOKO', 'R-CDC-001'),
        ]
        
        for code_banque, username, prenom, nom, matricule in responsables_data:
            resp, created = Utilisateur.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@{code_banque.lower()}.com',
                    'first_name': prenom,
                    'last_name': nom,
                    'role': Utilisateur.Role.RESPONSABLE_BANQUE,
                    'banque': banques[code_banque],
                    'matricule': matricule,
                    'telephone': f'+242 06 111 {code_banque[:3]} 01',
                    'is_staff': False,
                    'password': '1234'
                }
            )
            if created:
                resp.set_password('Resp123!')
                resp.save()
            self.stdout.write(f'  {"✨ Créé" if created else "✓ Existe"}: Responsable {code_banque} - {resp.username}')
        
        # Gestionnaires
        from apps.core.models import Agence
        gestionnaires_data = [
            ('ECOBANK', 'gest_ecobank1', 'Élisée', 'KONAN', 'G-ECO-001'),
            ('ECOBANK', 'gest_ecobank2', 'Estelle', 'MINZELET', 'G-ECO-002'),
            ('BGFI', 'gest_bgfi1', 'Pierre', 'NGOMA', 'G-BGF-001'),
            ('CDCO', 'gest_cdco1', 'Sophie', 'MBEMBA', 'G-CDC-001'),
        ]
        
        for code_banque, username, prenom, nom, matricule in gestionnaires_data:
            banque_obj = banques[code_banque]
            agence_obj, _ = Agence.objects.get_or_create(
                banque=banque_obj,
                code=f"{code_banque}-SIEGE",
                defaults={
                    'nom': f'Siège {banque_obj.nom_court}',
                    'ville': 'Brazzaville',
                    'active': True
                }
            )
            gest, created = Utilisateur.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@{code_banque.lower()}.com',
                    'first_name': prenom,
                    'last_name': nom,
                    'role': Utilisateur.Role.GESTIONNAIRE,
                    'banque': banque_obj,
                    'agence': agence_obj,
                    'matricule': matricule,
                    'telephone': f'+242 06 222 {code_banque[:3]} {username[-2:]}',
                    'is_staff': False,
                    'password':'1234'
                }
            )
            if created:
                gest.set_password('Gest123!')
                gest.save()
            self.stdout.write(f'  {"Créé" if created else "✓ Existe"}: Gestionnaire {code_banque} - {gest.username}')
        
        # Support
        support, created = Utilisateur.objects.get_or_create(
            username='support_nsia',
            defaults={
                'email': 'support@nsia.com',
                'first_name': 'Help',
                'last_name': 'Desk',
                'role': Utilisateur.Role.SUPPORT,
                'matricule': 'NSIA-SUP-001',
                'telephone': '+242 06 000 00 99',
                'is_staff': False,
                'password':'1234'
            }
        )
        if created:
            support.set_password('Support123!')
            support.save()
        self.stdout.write(f'  {"✨ Créé" if created else "✓ Existe"}: Support - {support.username}')
        
        # Résumé
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ Fixtures chargées avec succès !'))
        self.stdout.write('='*60)
        self.stdout.write(f'\n📊 STATISTIQUES:')
        self.stdout.write(f'  - Banques: {Banque.objects.count()}')
        self.stdout.write(f'  - Utilisateurs: {Utilisateur.objects.count()}')
        self.stdout.write(f'    • Super Admin: {Utilisateur.objects.filter(role=Utilisateur.Role.SUPER_ADMIN).count()}')
        self.stdout.write(f'    • Admin NSIA: {Utilisateur.objects.filter(role=Utilisateur.Role.ADMIN_NSIA).count()}')
        self.stdout.write(f'    • Responsables: {Utilisateur.objects.filter(role=Utilisateur.Role.RESPONSABLE_BANQUE).count()}')
        self.stdout.write(f'    • Gestionnaires: {Utilisateur.objects.filter(role=Utilisateur.Role.GESTIONNAIRE).count()}')
        self.stdout.write(f'    • Support: {Utilisateur.objects.filter(role=Utilisateur.Role.SUPPORT).count()}')
        
        self.stdout.write('\n🔑 IDENTIFIANTS DE CONNEXION (tous les mots de passe):')
        self.stdout.write('  - Super Admin / Admin NSIA: Admin123!')
        self.stdout.write('  - Responsables: Resp123!')
        self.stdout.write('  - Gestionnaires: Gest123!')
        self.stdout.write('  - Support: Support123!')
        self.stdout.write('\n💡 Exemple: username=super_admin, password=Admin123!')
        self.stdout.write('')