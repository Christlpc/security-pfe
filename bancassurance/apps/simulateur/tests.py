"""
Tests pour le simulateur Emprunteur NSIA
Phase 3 : Tests unitaires et d'intégration
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal

from apps.core.models import Banque, Produit, ProduitBanque
from apps.tarification.models import TableTauxEmprunteur
from apps.simulateur.models import Simulation, Souscription
from apps.simulateur.services.calculateur_emprunteur import CalculateurEmprunteur
from apps.simulateur.services.calculateur_retraite import CalculateurRetraite
from apps.simulateur.services.calculateur_etudes import CalculateurEtudes

User = get_user_model()


class CalculateurEmprunteurTestCase(TestCase):
    """Tests pour le calculateur emprunteur"""
    
    def setUp(self):
        """Configuration initiale des tests"""
        # Créer une banque de test
        self.banque = Banque.objects.create(
            nom_complet='CDCO Test',
            code_banque='CDCO',
            email_contact='test@cdco.cg',
            statut='ACTIF'
        )
        # Autoriser le produit emprunteur
        produit, _ = Produit.objects.get_or_create(code='emprunteur', defaults={'nom': 'Assurance Emprunteur', 'est_actif': True})
        ProduitBanque.objects.get_or_create(banque=self.banque, produit=produit, defaults={'est_actif': True})
        
        # Créer un taux de test (CDCO : 0.5% fixe)
        self.taux = TableTauxEmprunteur.objects.create(
            banque=self.banque,
            tranche_age='Tous âges',
            age_min=18,
            age_max=64,
            duree_annees=1,
            duree_mois=None,
            taux_pourcentage=Decimal('0.500'),
            frais_accessoires=Decimal('2500'),
            produit='emprunteur',
            date_debut_validite=date.today(),
            actif=True
        )
        
        # Initialiser le calculateur
        self.calculateur = CalculateurEmprunteur(self.banque)
    
    def test_calcul_emprunteur_base(self):
        """Test du calcul de base (cas CDCO Excel)"""
        parametres = {
            'montant_pret': 650000,
            'duree_mois': 9,
            'date_naissance': date(1982, 3, 26),
            'date_effet': date(2022, 1, 17),
            'taux_surprime': 0,
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Vérifications
        self.assertEqual(resultats['age_emprunteur'], 39)
        self.assertEqual(resultats['taux_applique'], 0.5)
        self.assertEqual(resultats['duree_mois'], 9)
        
        # Prime nette = 0.5% × (650000 × 9 × 1) / 12 = 2437.5 ≈ 2438
        self.assertAlmostEqual(float(resultats['prime_nette']), 2438, delta=1)
        
        # Frais accessoires
        self.assertEqual(float(resultats['frais_accessoires']), 2500)
        
        # Prime totale = 2438 + 0 + 2500 = 4938
        self.assertAlmostEqual(float(resultats['prime_totale']), 4938, delta=1)
        
        # Net à débourser = 650000 - 4938 = 645062
        self.assertAlmostEqual(float(resultats['net_a_debourser']), 645062, delta=1)
    
    def test_calcul_avec_surprime(self):
        """Test du calcul avec surprime"""
        parametres = {
            'montant_pret': 1000000,
            'duree_mois': 12,
            'date_naissance': date(1990, 5, 15),
            'date_effet': date.today(),
            'taux_surprime': 1.5,  # 1.5%
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Surprime = 1000000 × 1.5% × (12/12) = 15000
        self.assertAlmostEqual(float(resultats['surprime']), 15000, delta=1)
        
        # La prime totale doit inclure la surprime
        self.assertGreater(float(resultats['prime_totale']), float(resultats['prime_nette']))
    
    def test_validation_age_minimum(self):
        """Test de validation : âge minimum 18 ans"""
        parametres = {
            'montant_pret': 500000,
            'duree_mois': 12,
            'date_naissance': date.today() - timedelta(days=365 * 17),  # 17 ans
            'date_effet': date.today(),
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('18 ans', str(context.exception))
    
    def test_validation_age_maximum(self):
        """Test de validation : âge maximum 64 ans"""
        parametres = {
            'montant_pret': 500000,
            'duree_mois': 12,
            'date_naissance': date(1950, 1, 1),  # > 64 ans
            'date_effet': date.today(),
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('64 ans', str(context.exception))
    
    def test_validation_montant_positif(self):
        """Test de validation : montant positif"""
        parametres = {
            'montant_pret': -500000,  # Négatif
            'duree_mois': 12,
            'date_naissance': date(1990, 1, 1),
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)
    
    def test_validation_duree_valide(self):
        """Test de validation : durée valide"""
        parametres = {
            'montant_pret': 500000,
            'duree_mois': 0,  # Durée invalide
            'date_naissance': date(1990, 1, 1),
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)


class SimulationModelTestCase(TestCase):
    """Tests pour le modèle Simulation"""
    
    def setUp(self):
        """Configuration initiale"""
        self.banque = Banque.objects.create(
            nom_complet='BGFI Test',
            code_banque='BGFI',
            email_contact='test@bgfi.cg',
            statut='ACTIF'
        )
        # Autoriser le produit emprunteur
        produit, _ = Produit.objects.get_or_create(code='emprunteur', defaults={'nom': 'Assurance Emprunteur', 'est_actif': True})
        ProduitBanque.objects.get_or_create(banque=self.banque, produit=produit, defaults={'est_actif': True})
        
        from apps.core.models import Agence
        self.agence = Agence.objects.create(banque=self.banque, code='TEST_AGENCE', nom='Agence Test')
        self.user = User.objects.create_user(
            username='gestionnaire_test',
            email='gestionnaire@test.com',
            password='testpass123',
            first_name='Jean',
            last_name='Dupont',
            role=User.Role.GESTIONNAIRE,
            banque=self.banque,
            agence=self.agence
        )
    
    def test_creation_simulation(self):
        """Test de création d'une simulation"""
        simulation = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
            statut='brouillon',
            donnees_entree={'montant_pret': 500000},
        )
        
        # Vérifier que la référence est générée automatiquement
        self.assertIsNotNone(simulation.reference)
        self.assertTrue(simulation.reference.startswith('SIM-BGFI-'))
    
    def test_generation_reference_unique(self):
        """Test que les références générées sont uniques"""
        sim1 = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
        )
        
        sim2 = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
        )
        
        self.assertNotEqual(sim1.reference, sim2.reference)
    
    def test_marquer_comme_calculee(self):
        """Test de la méthode marquer_comme_calculee"""
        simulation = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
            statut='brouillon',
        )
        
        resultats = {'prime_totale': 5000, 'taux_applique': 0.5}
        simulation.marquer_comme_calculee(resultats)
        
        simulation.refresh_from_db()
        self.assertEqual(simulation.statut, 'calculee')
        self.assertEqual(simulation.resultats_calcul, resultats)
    
    def test_peut_etre_convertie(self):
        """Test de la méthode peut_etre_convertie"""
        simulation = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
            statut='brouillon',
        )
        
        # Simulation en brouillon ne peut pas être convertie
        self.assertFalse(simulation.peut_etre_convertie())
        
        # Après validation, peut être convertie
        simulation.marquer_comme_validee()
        self.assertTrue(simulation.peut_etre_convertie())


class SouscriptionModelTestCase(TestCase):
    """Tests pour le modèle Souscription"""
    
    def setUp(self):
        """Configuration initiale"""
        self.banque = Banque.objects.create(
            nom_complet='CDCO Test',
            code_banque='CDCO',
            email_contact='test@cdco.cg',
            statut='ACTIF'
        )
        # Autoriser le produit emprunteur
        produit, _ = Produit.objects.get_or_create(code='emprunteur', defaults={'nom': 'Assurance Emprunteur', 'est_actif': True})
        ProduitBanque.objects.get_or_create(banque=self.banque, produit=produit, defaults={'est_actif': True})
        
        from apps.core.models import Agence
        self.agence = Agence.objects.create(banque=self.banque, code='TEST_AGENCE', nom='Agence Test')
        self.user = User.objects.create_user(
            username='gestionnaire_test',
            email='gestionnaire@test.com',
            password='testpass123',
            role=User.Role.GESTIONNAIRE,
            banque=self.banque,
            agence=self.agence
        )
        
        self.simulation = Simulation.objects.create(
            banque=self.banque,
            gestionnaire=self.user,
            produit='emprunteur',
            statut='validee',
            resultats_calcul={'prime_totale': 5000},
        )
    
    def test_creation_souscription(self):
        """Test de création d'une souscription"""
        souscription = Souscription.objects.create(
            simulation=self.simulation,
            banque=self.banque,
            gestionnaire=self.user,
            nom='Doe',
            prenom='John',
            date_naissance=date(1985, 6, 15),
            email='john.doe@example.com',
            telephone='+242123456789',
            adresse='123 Rue Test',
            montant_prime=5000,
        )
        
        # Vérifier génération automatique de la référence
        self.assertIsNotNone(souscription.reference)
        self.assertTrue(souscription.reference.startswith('SOUSCR-CDCO-'))
        
        # Vérifier que la simulation est marquée comme convertie
        self.simulation.refresh_from_db()
        self.assertEqual(self.simulation.statut, 'convertie')
    
    def test_validation_souscription(self):
        """Test de validation d'une souscription"""
        souscription = Souscription.objects.create(
            simulation=self.simulation,
            banque=self.banque,
            gestionnaire=self.user,
            nom='Doe',
            prenom='John',
            date_naissance=date(1985, 6, 15),
            email='john.doe@example.com',
            telephone='+242123456789',
            adresse='123 Rue Test',
            montant_prime=5000,
        )
        
        # Valider
        souscription.valider()
        
        souscription.refresh_from_db()
        self.assertEqual(souscription.statut, 'validee')
        self.assertIsNotNone(souscription.numero_police)
        self.assertIsNotNone(souscription.date_validation)
    
    def test_rejet_souscription(self):
        """Test de rejet d'une souscription"""
        souscription = Souscription.objects.create(
            simulation=self.simulation,
            banque=self.banque,
            gestionnaire=self.user,
            nom='Doe',
            prenom='John',
            date_naissance=date(1985, 6, 15),
            email='john.doe@example.com',
            telephone='+242123456789',
            adresse='123 Rue Test',
            montant_prime=5000,
        )
        
        # Rejeter
        motif = 'Documents incomplets'
        souscription.rejeter(motif)
        
        souscription.refresh_from_db()
        self.assertEqual(souscription.statut, 'rejetee')
        self.assertEqual(souscription.motif_rejet, motif)
        self.assertIsNotNone(souscription.date_rejet)
    
    def test_calcul_age_souscripteur(self):
        """Test du calcul de l'âge du souscripteur"""
        souscription = Souscription.objects.create(
            simulation=self.simulation,
            banque=self.banque,
            gestionnaire=self.user,
            nom='Doe',
            prenom='John',
            date_naissance=date(1990, 1, 1),
            email='john.doe@example.com',
            telephone='+242123456789',
            adresse='123 Rue Test',
            montant_prime=5000,
        )
        
        age = souscription.get_age_souscripteur()
        self.assertIsNotNone(age)
        self.assertGreater(age, 0)
        self.assertLess(age, 150)  # Sanity check


class CalculateurRetraiteTestCase(TestCase):
    """Tests pour le calculateur retraite"""
    
    def setUp(self):
        """Configuration initiale des tests"""
        # Créer une banque de test
        self.banque = Banque.objects.create(
            nom_complet='Test Banque',
            code_banque='TEST',
            email_contact='test@test.cg',
            statut='ACTIF'
        )
        # Autoriser le produit retraite
        produit, _ = Produit.objects.get_or_create(code='retraite', defaults={'nom': 'Assurance Retraite', 'est_actif': True})
        ProduitBanque.objects.get_or_create(banque=self.banque, produit=produit, defaults={'est_actif': True})
        
        # Créer des données CIMA H de test pour les âges requis
        from apps.tarification.models import TableCIMA_H
        for age in [42, 47, 49, 50, 52]:
            TableCIMA_H.objects.create(
                x=age,
                Nx=Decimal('5000000') if age == 42 else Decimal('4000000'),
                Mx=Decimal('1000000') if age == 42 else Decimal('800000'),
                Dx=Decimal('100000') if age == 42 else Decimal('90000'),
                lx=Decimal('95000') if age == 42 else Decimal('94000'),
                dxx=Decimal('500') if age == 42 else Decimal('600'),
                qx=Decimal('0.005') if age == 42 else Decimal('0.006'),
                Cx=Decimal('5000') if age == 42 else Decimal('5500')
            )
        
        # Initialiser le calculateur
        self.calculateur = CalculateurRetraite(self.banque)
    
    def test_calcul_retraite_base_semestriel(self):
        """Test du calcul de base avec périodicité semestrielle"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'capital_deces': 0,
            'duree': 7,
            'age': 42,
            'periodicite': 'S'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Vérifications de base
        self.assertEqual(resultats['age'], 42)
        self.assertEqual(resultats['duree'], 7)
        self.assertEqual(resultats['periodicite'], 'S')
        self.assertEqual(resultats['periodicite_libelle'], 'Semestrielle')
        self.assertEqual(resultats['nombre_periodes'], 14)  # 7 ans × 2 semestres
        
        # Vérifier que le capital garanti est calculé
        self.assertGreater(float(resultats['capital_garanti']), 0)
        
        # Vérifier que la prime totale est cohérente
        self.assertGreater(float(resultats['prime_totale']), 0)
    
    def test_calcul_retraite_mensuel(self):
        """Test du calcul avec périodicité mensuelle"""
        parametres = {
            'prime_periodique_commerciale': 50000,
            'capital_deces': 0,
            'duree': 5,
            'age': 42,
            'periodicite': 'M'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        self.assertEqual(resultats['periodicite'], 'M')
        self.assertEqual(resultats['periodicite_libelle'], 'Mensuelle')
        self.assertEqual(resultats['nombre_periodes'], 60)  # 5 ans × 12 mois
    
    def test_calcul_retraite_annuel(self):
        """Test du calcul avec périodicité annuelle"""
        parametres = {
            'prime_periodique_commerciale': 500000,
            'capital_deces': 0,
            'duree': 10,
            'age': 42,
            'periodicite': 'A'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        self.assertEqual(resultats['periodicite'], 'A')
        self.assertEqual(resultats['periodicite_libelle'], 'Annuelle')
        self.assertEqual(resultats['nombre_periodes'], 10)  # 10 ans × 1
    
    def test_calcul_retraite_trimestriel(self):
        """Test du calcul avec périodicité trimestrielle"""
        parametres = {
            'prime_periodique_commerciale': 100000,
            'capital_deces': 0,
            'duree': 8,
            'age': 42,
            'periodicite': 'T'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        self.assertEqual(resultats['periodicite'], 'T')
        self.assertEqual(resultats['periodicite_libelle'], 'Trimestrielle')
        self.assertEqual(resultats['nombre_periodes'], 32)  # 8 ans × 4 trimestres
    
    def test_calcul_retraite_avec_capital_deces(self):
        """Test du calcul avec capital décès"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'capital_deces': 5000000,
            'duree': 7,
            'age': 42,
            'periodicite': 'S'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Vérifier que la prime décès est > 0
        self.assertGreater(float(resultats['prime_deces']), 0)
        
        # Vérifier que le capital décès est dans les résultats
        self.assertEqual(float(resultats['capital_deces']), 5000000)
    
    def test_validation_age_minimum(self):
        """Test de validation : âge minimum 18 ans"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'duree': 7,
            'age': 17,  # Trop jeune
            'periodicite': 'S'
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('18', str(context.exception))
    
    def test_validation_age_maximum(self):
        """Test de validation : âge maximum 65 ans"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'duree': 7,
            'age': 66,  # Trop vieux
            'periodicite': 'S'
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('65 ans', str(context.exception))
    
    def test_validation_duree_maximum(self):
        """Test de validation : durée maximum 40 ans"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'duree': 41,  # Trop long
            'age': 42,
            'periodicite': 'S'
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('40 ans', str(context.exception))
    
    def test_validation_periodicite_invalide(self):
        """Test de validation : périodicité invalide"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'duree': 7,
            'age': 42,
            'periodicite': 'X'  # Invalide
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('périodicité', str(context.exception).lower())
    
    def test_validation_prime_positive(self):
        """Test de validation : prime positive"""
        parametres = {
            'prime_periodique_commerciale': -1000,  # Négatif
            'duree': 7,
            'age': 42,
            'periodicite': 'S'
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)
    
    def test_frais_accessoires(self):
        """Test que les frais accessoires sont ajoutés"""
        parametres = {
            'prime_periodique_commerciale': 80000,
            'capital_deces': 0,
            'duree': 7,
            'age': 42,
            'periodicite': 'S'
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Vérifier que les frais accessoires sont présents
        self.assertEqual(float(resultats['frais_accessoires']), 1000)
        
        # Vérifier que la PPC finale inclut les frais
        self.assertEqual(
            float(resultats['prime_periodique_commerciale']),
            80000 + 1000
        )


class CalculateurEtudesTestCase(TestCase):
    """Tests pour le calculateur études"""
    
    def setUp(self):
        """Configuration initiale des tests"""
        # Créer une banque de test
        self.banque = Banque.objects.create(
            nom_complet='Test Banque',
            code_banque='TEST',
            email_contact='test@test.cg',
            statut='ACTIF'
        )
        # Autoriser le produit etudes
        produit, _ = Produit.objects.get_or_create(code='etudes', defaults={'nom': 'Assurance Etudes', 'est_actif': True})
        ProduitBanque.objects.get_or_create(banque=self.banque, produit=produit, defaults={'est_actif': True})
        
        # Créer des données de test dans TablePrimesEtudes et TableTauxMensuels
        from apps.tarification.models import TablePrimesEtudes, TableTauxMensuels
        
        # Prime unique
        TablePrimesEtudes.objects.create(
            age=30,
            duree_paiement=14,
            duree_rente=5,
            type_prime='UNIQUE',
            produit='1M',
            montant=Decimal('500000')
        )
        
        # Prime annuelle
        TablePrimesEtudes.objects.create(
            age=30,
            duree_paiement=14,
            duree_rente=5,
            type_prime='ANNUELLE',
            produit='1M',
            montant=Decimal('50000')
        )
        
        # Taux mensuel
        TableTauxMensuels.objects.create(
            age=30,
            duree_paiement=14,
            duree_rente=5,
            produit='NSIA-ETUDES',
            taux=Decimal('0.00409')
        )
        
        # Prime unique (age 35)
        TablePrimesEtudes.objects.create(
            age=35,
            duree_paiement=10,
            duree_rente=5,
            type_prime='UNIQUE',
            produit='1M',
            montant=Decimal('500000')
        )
        
        # Prime annuelle (age 35)
        TablePrimesEtudes.objects.create(
            age=35,
            duree_paiement=10,
            duree_rente=5,
            type_prime='ANNUELLE',
            produit='1M',
            montant=Decimal('50000')
        )
        
        # Taux mensuel (age 35)
        TableTauxMensuels.objects.create(
            age=35,
            duree_paiement=10,
            duree_rente=5,
            produit='NSIA-ETUDES',
            taux=Decimal('0.00409')
        )
        
        # Initialiser le calculateur
        self.calculateur = CalculateurEtudes(self.banque)
    
    def test_calcul_etudes_base(self):
        """Test du calcul de base"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Vérifications
        self.assertEqual(resultats['age_parent'], 30)
        self.assertEqual(resultats['age_enfant'], 0)
        self.assertEqual(resultats['duree_paiement'], 14)
        self.assertEqual(resultats['duree_service'], 5)
        self.assertEqual(resultats['debut_service'], 14)
        self.assertEqual(resultats['fin_service'], 19)
        
        # Vérifier que les primes sont calculées
        self.assertGreater(float(resultats['prime_unique']), 0)
        self.assertGreater(float(resultats['prime_annuelle']), 0)
        self.assertGreater(float(resultats['prime_mensuelle']), 0)
    
    def test_determination_code_produit(self):
        """Test de la détermination du code produit"""
        test_cases = [
            (100000, "100k"),
            (200000, "200k"),
            (1000000, "1M"),
            (2500000, "2.5M"),
            (3000000, "3M"),
        ]
        
        for montant, code_attendu in test_cases:
            code = self.calculateur._determiner_code_produit(Decimal(montant))
            self.assertEqual(code, code_attendu)
    
    def test_calcul_prime_mensuelle(self):
        """Test du calcul de la prime mensuelle"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Prime mensuelle = montant_rente × taux_mensuel
        # 1000000 × 0.00409 = 4090
        self.assertAlmostEqual(
            float(resultats['prime_mensuelle']),
            4090,
            delta=10
        )
    
    def test_calcul_dates_service(self):
        """Test du calcul des dates de service"""
        parametres = {
            'age_parent': 35,
            'age_enfant': 5,
            'montant_rente': 1000000,
            'duree_paiement': 10,
            'duree_service': 5
        }
        
        resultats = self.calculateur.calculer(parametres)
        
        # Début service = age_enfant + duree_paiement = 5 + 10 = 15
        self.assertEqual(resultats['debut_service'], 15)
        
        # Fin service = debut_service + duree_service = 15 + 5 = 20
        self.assertEqual(resultats['fin_service'], 20)
    
    def test_validation_age_parent_minimum(self):
        """Test de validation : âge parent minimum"""
        parametres = {
            'age_parent': 17,  # Trop jeune
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('18', str(context.exception))
    
    def test_validation_age_parent_maximum(self):
        """Test de validation : âge parent maximum"""
        parametres = {
            'age_parent': 66,  # Trop vieux
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('65', str(context.exception))
    
    def test_validation_age_enfant_invalide(self):
        """Test de validation : âge enfant invalide"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 19,  # Trop vieux
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        with self.assertRaises(ValueError) as context:
            self.calculateur.calculer(parametres)
        
        self.assertIn('18', str(context.exception))
    
    def test_validation_montant_rente_positif(self):
        """Test de validation : montant rente positif"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 0,
            'montant_rente': -100000,  # Négatif
            'duree_paiement': 14,
            'duree_service': 5
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)
    
    def test_validation_duree_paiement_valide(self):
        """Test de validation : durée paiement valide"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 0,  # Invalide
            'duree_service': 5
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)
    
    def test_validation_duree_service_valide(self):
        """Test de validation : durée service valide"""
        parametres = {
            'age_parent': 30,
            'age_enfant': 0,
            'montant_rente': 1000000,
            'duree_paiement': 14,
            'duree_service': 0  # Invalide
        }
        
        with self.assertRaises(ValueError):
            self.calculateur.calculer(parametres)