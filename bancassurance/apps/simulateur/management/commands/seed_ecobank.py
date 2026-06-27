import random
import uuid
from datetime import date, datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.core.models import Banque, Agence, Utilisateur
from apps.simulateur.models import Simulation, Souscription

class Command(BaseCommand):
    help = "Seed la base de données avec des dizaines de simulations et souscriptions pour Ecobank."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Début du seeding Ecobank..."))

        # 1. Récupérer ou créer la banque Ecobank
        banque, created = Banque.objects.get_or_create(
            code_banque="ECOBANK",
            defaults={
                "nom_complet": "Ecobank Congo",
                "nom_court": "Ecobank",
                "couleur_primaire": "#003366",
                "couleur_secondaire": "#FF9900",
                "police_principale": "Arial",
                "email_contact": "contact@ecobank.com",
                "telephone_contact": "+242 05 532 50 00",
                "adresse": "Avenue du Camp BP. 2485, Brazzaville République du Congo",
                "date_partenariat": date(2023, 1, 15),
            }
        )
        if created:
            self.stdout.write(f"  🏢 Banque ECOBANK créée.")
        else:
            self.stdout.write(f"  🏢 Banque ECOBANK existante récupérée.")

        # 2. S'assurer de la présence des 15 agences d'Ecobank
        branches = [
            "Plateau", "Poto-Poto", "Tsiengui", "Mpila", "Brazzaville-Centre",
            "Pointe-Noire", "Ouesso", "Makoua", "Dolisie", "Sibiti",
            "Oyo", "Ngoyo", "Djambala", "Mossendjo", "Ewo"
        ]
        
        agences = []
        for branch_name in branches:
            code = f"ECOBANK-{branch_name.upper()}"
            agence, ag_created = Agence.objects.get_or_create(
                banque=banque,
                code=code,
                defaults={
                    "nom": f"Ecobank - {branch_name}",
                    "ville": "Pointe-Noire" if branch_name in ["Pointe-Noire", "Ngoyo"] else "Dolisie" if branch_name == "Dolisie" else "Brazzaville",
                    "active": True
                }
            )
            agences.append(agence)
            if ag_created:
                self.stdout.write(f"    ✨ Agence créée : {code}")

        self.stdout.write(self.style.SUCCESS(f"  ✅ {len(agences)} agences Ecobank prêtes."))

        # 3. Récupérer les gestionnaires d'Ecobank
        gestionnaires = list(Utilisateur.objects.filter(banque=banque, role=Utilisateur.Role.GESTIONNAIRE))
        if not gestionnaires:
            self.stdout.write(self.style.WARNING("  ⚠️ Aucun gestionnaire Ecobank trouvé. Création de gest_ecobank1..."))
            # S'assurer d'avoir au moins une agence de rattachement
            agence_siege = agences[0]
            gest = Utilisateur.objects.create(
                username="gest_ecobank1",
                email="gest_ecobank1@ecobank.com",
                first_name="Élisée",
                last_name="KONAN",
                role=Utilisateur.Role.GESTIONNAIRE,
                banque=banque,
                agence=agence_siege,
                matricule="G-ECO-001",
                telephone="+242 06 222 ECO 01",
                is_active=True
            )
            gest.set_password("Gest123!")
            gest.save()
            gestionnaires = [gest]

        # Noms/prénoms fictifs pour le seeding
        noms = ["KOUALA", "SAMBA", "NTSILA", "MOUYABI", "MAKOSSO", "MILANDOU", "MASSAMBA", "OKEMBA", "BASSOUA", "MABIALA", "NGOMA", "DZON", "TCHICAYA", "LOUMOUAMOU", "NDINGA"]
        prenoms = ["Jean", "Marie", "Guy", "Estelle", "Christian", "Patrice", "Aline", "Félix", "Chantal", "Arnaud", "Bernadette", "Serge", "Ghislain", "Sylvie", "Rodrigue"]
        professions = ["Enseignant", "Médecin", "Comptable", "Ingénieur IT", "Commerçant", "Cadre Banque", "Avocat", "Fonctionnaire", "Consultant", "Pharmacien"]
        employeurs = ["État Congolais", "Congo Telecom", "SARPD Oil", "NSIA Assurances", "Brasseries du Congo", "TotalEnergies EP Congo", "Ecobank", "Privé"]

        # Produits NSIA
        produits = ['emprunteur', 'retraite', 'etudes', 'elikia', 'mobateli', 'epargne_plus']

        # Générer 50 simulations
        self.stdout.write("📦 Génération de 50 simulations...")
        
        maintenant = timezone.now()
        start_date = maintenant - timedelta(days=180)  # 6 mois en arrière

        simulations_creees = []
        for i in range(50):
            produit = random.choice(produits)
            
            # Déterminer le statut
            # Pour faire environ 20 souscriptions (convertie), on force le statut convertie sur 20 d'entre elles
            if len(simulations_creees) < 20:
                statut = 'convertie'
            else:
                statut = random.choice(['brouillon', 'calculee', 'validee', 'abandonnee'])
            
            # Infos client
            nom_c = random.choice(noms)
            prenom_c = random.choice(prenoms)
            email_c = f"{prenom_c.lower()}.{nom_c.lower()}@gmail.com"
            tel_c = f"+242 06 600 {random.randint(10, 99)} {random.randint(10, 99)}"
            
            # Sélectionner agence et gestionnaire au hasard
            agence = random.choice(agences)
            gestionnaire = random.choice(gestionnaires)

            # Moduler les données d'entrée par produit
            donnees_entree = {
                "nom_conseiller": gestionnaire.get_full_name(),
                "nom": nom_c,
                "prenom": prenom_c,
                "date_naissance": (date.today() - timedelta(days=365*random.randint(25, 55))).isoformat(),
                "lieu_naissance": random.choice(["Brazzaville", "Pointe-Noire", "Dolisie", "Oyo"]),
                "situation_matrimoniale": random.choice(["celibataire", "marie", "divorce"]),
                "adresse_postale": f"BP {random.randint(100, 9999)} Brazzaville",
                "profession": random.choice(professions),
                "employeur": random.choice(employeurs),
                "numero_compte": f"CG02 00101 {random.randint(100000, 999999)} {random.randint(10, 99)}",
            }
            
            resultats_calcul = {}
            
            if produit == 'emprunteur':
                montant_pret = random.choice([5000000, 10000000, 15000000, 25000000, 45000000])
                duree_mois = random.choice([24, 36, 60, 84, 120])
                taux_pret = random.choice([6.5, 7.5, 8.0, 9.5])
                donnees_entree.update({
                    "montant_pret": montant_pret,
                    "duree_mois": duree_mois,
                    "taux_interet": taux_pret,
                    "type_pret": "amortissable",
                    "periodicite_remboursement": "mensuelle",
                    "date_effet": (date.today() - timedelta(days=random.randint(1, 100))).isoformat()
                })
                prime = int(montant_pret * (taux_pret / 100) * (duree_mois / 12) * random.uniform(0.08, 0.12))
                resultats_calcul = {
                    "prime_totale": prime,
                    "taux_applique": round(taux_pret / 100 * random.uniform(0.08, 0.12), 4),
                    "accessoires": 5000,
                    "taxes": int(prime * 0.05)
                }
            elif produit == 'retraite':
                cotisation = random.choice([25000, 50000, 100000, 150000])
                duree_ans = random.choice([10, 15, 20, 25])
                donnees_entree.update({
                    "cotisation_mensuelle": cotisation,
                    "duree_cotisation_ans": duree_ans,
                })
                resultats_calcul = {
                    "prime_totale": cotisation * 12 * duree_ans,
                    "capital_garanti_estime": int(cotisation * 12 * duree_ans * random.uniform(1.2, 1.4))
                }
            elif produit == 'etudes':
                cotisation = random.choice([15000, 30000, 50000])
                duree_ans = random.choice([5, 8, 12, 15])
                donnees_entree.update({
                    "cotisation_mensuelle": cotisation,
                    "duree_epargne_ans": duree_ans,
                })
                resultats_calcul = {
                    "prime_totale": cotisation * 12 * duree_ans,
                    "rente_annuelle_garantie": int(cotisation * 12 * random.uniform(1.1, 1.3))
                }
            elif produit == 'elikia':
                capital = random.choice([1000000, 2000000, 3000000, 5000000])
                donnees_entree.update({
                    "capital_garanti": capital,
                    "duree_ans": random.choice([5, 7, 10])
                })
                resultats_calcul = {
                    "prime_totale": int(capital * random.uniform(0.015, 0.025) * 12),
                    "prime_mensuelle": int(capital * random.uniform(0.015, 0.025))
                }
            elif produit == 'mobateli':
                capital = random.choice([2000000, 4000000, 5000000, 10000000])
                donnees_entree.update({
                    "capital_deces": capital,
                })
                resultats_calcul = {
                    "prime_totale": int(capital * random.uniform(0.005, 0.015)),
                    "prime_mensuelle": int(capital * random.uniform(0.005, 0.015) / 12)
                }
            else: # epargne_plus
                initial = random.choice([200000, 500000, 1000000])
                mensuel = random.choice([20000, 50000, 100000])
                donnees_entree.update({
                    "versement_initial": initial,
                    "versement_mensuel": mensuel,
                    "duree_annees": random.choice([5, 8, 10])
                })
                resultats_calcul = {
                    "prime_totale": initial + (mensuel * 12 * 5),
                    "capital_acquis_estime": int((initial + (mensuel * 12 * 5)) * random.uniform(1.15, 1.25))
                }

            # Générer une date aléatoire sur la période de 6 mois
            date_creation_random = start_date + timedelta(seconds=random.randint(0, int((maintenant - start_date).total_seconds())))

            # Créer la simulation
            sim = Simulation.objects.create(
                banque=banque,
                agence=agence,
                gestionnaire=gestionnaire,
                produit=produit,
                statut=statut,
                donnees_entree=donnees_entree,
                resultats_calcul=resultats_calcul,
                nom_client=nom_c,
                prenom_client=prenom_c,
                email_client=email_c,
                telephone_client=tel_c,
                est_test=False
            )
            
            # Forcer la date de création historique en base (auto_now_add empêche de le faire directement dans .create)
            Simulation.objects.filter(id=sim.id).update(date_creation=date_creation_random, date_modification=date_creation_random)
            
            simulations_creees.append(sim)

        self.stdout.write(self.style.SUCCESS(f"  ✅ 50 simulations créées pour Ecobank."))

        # 4. Créer 20 souscriptions basées sur les simulations marquées 'convertie'
        self.stdout.write("📦 Création de 20 souscriptions...")
        souscriptions_creees = 0
        for sim in simulations_creees:
            if sim.statut == 'convertie':
                # Choisir un statut de souscription cohérent
                statut_s = random.choice(['en_cours', 'validee', 'active', 'resiliee'])
                
                nom_c = sim.nom_client
                prenom_c = sim.prenom_client
                
                date_naissance = date.today() - timedelta(days=365*random.randint(25, 55))
                
                # Date de souscription après la date de création de la simulation
                date_souscr = sim.date_creation + timedelta(days=random.randint(1, 5))
                
                # Si validée/active, générer un numéro de police et date d'effet
                num_police = None
                date_effet = None
                date_echeance = None
                if statut_s in ['validee', 'active', 'resiliee']:
                    num_police = f"POL-ECO-{random.randint(100000, 999999)}"
                    date_effet = (date_souscr + timedelta(days=1)).date()
                    date_echeance = date_effet + timedelta(days=365)

                prime_totale = sim.get_montant_prime() or random.randint(50000, 500000)

                souscr = Souscription.objects.create(
                    simulation=sim,
                    banque=banque,
                    gestionnaire=sim.gestionnaire,
                    statut=statut_s,
                    nom=nom_c,
                    prenom=prenom_c,
                    date_naissance=date_naissance,
                    lieu_naissance=sim.donnees_entree.get('lieu_naissance', 'Brazzaville'),
                    email=sim.email_client,
                    telephone=sim.telephone_client,
                    adresse=sim.donnees_entree.get('adresse_postale', 'BP 00 Brazzaville'),
                    profession=sim.donnees_entree.get('profession', ''),
                    employeur=sim.donnees_entree.get('employeur', ''),
                    numero_compte=sim.donnees_entree.get('numero_compte', ''),
                    montant_prime=prime_totale,
                    donnees_produit=sim.resultats_calcul,
                    numero_police=num_police,
                    date_effet_contrat=date_effet,
                    date_echeance_contrat=date_echeance,
                )
                
                # Forcer la date de souscription historique
                Souscription.objects.filter(id=souscr.id).update(date_souscription=date_souscr, date_modification=date_souscr)
                
                # Si validée ou active, mettre à jour la date_validation également
                if statut_s in ['validee', 'active']:
                    Souscription.objects.filter(id=souscr.id).update(date_validation=date_souscr + timedelta(hours=12))
                
                souscriptions_creees += 1

        self.stdout.write(self.style.SUCCESS(f"  ✅ {souscriptions_creees} souscriptions associées créées pour Ecobank."))
        self.stdout.write(self.style.SUCCESS("🎉 Seeding Ecobank terminé avec succès !"))
