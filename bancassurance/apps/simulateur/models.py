"""
Modèles pour le simulateur d'assurance NSIA
Phase 3 : Simulation et Souscription
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.forms import ValidationError
from django.utils import timezone
import uuid
import json

from apps.core.models import TenantManager
from apps.core.security import EncryptedCharField, EncryptedTextField, hash_value

User = get_user_model()



class Simulation(models.Model):
    """
    Simulation d'assurance pour tous les produits NSIA
    Stocke les entrées utilisateur et les résultats de calcul
    """
    objects = TenantManager()  # Activation de l'isolation multi-tenant ORM
    
    # Choix des produits
    # NOTE: 'likama' a été fusionné avec 'mobateli' (même produit DTC/IAD, banques différentes)
    PRODUIT_CHOICES = [
        ('emprunteur', 'Assurance Emprunteur'),
        ('retraite', 'Confort Retraite'),
        ('etudes', 'Confort Études'),
        ('elikia', 'Elikia Scolaire'),
        ('mobateli', 'Prévoyance (DTC/IAD)'),
        ('epargne_plus', 'Épargne Plus'),
    ]
    
    # Statuts de simulation
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('calculee', 'Calculée'),
        ('validee', 'Validée'),
        ('convertie', 'Convertie en souscription'),
        ('abandonnee', 'Abandonnée'),
    ]
    
    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="Référence",
        help_text="Ex: SIM-BGFI-20250106-001"
    )
    
    # Relations
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        related_name='simulations',
        verbose_name="Banque"
    )

    # NOUVEAU CHAMP
    agence = models.ForeignKey(
        'core.Agence',
        on_delete=models.PROTECT,
        related_name='simulations',
        null=True,
        blank=True,
        help_text="Agence qui a créé la simulation"
    )
    
    gestionnaire = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='simulations_creees',
        verbose_name="Gestionnaire créateur"
    )
    
    # Type et statut
    produit = models.CharField(
        max_length=20,
        choices=PRODUIT_CHOICES,
        verbose_name="Type de produit"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='brouillon',
        verbose_name="Statut"
    )
    
    # Données de simulation (JSON flexible)
    donnees_entree = models.JSONField(
        default=dict,
        verbose_name="Données d'entrée",
        help_text="Inputs de l'utilisateur (montant, durée, âge...)"
    )
    
    resultats_calcul = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Résultats du calcul",
        help_text="Outputs du calculateur (primes, taux...)"
    )
    
    # Informations client (optionnel pour simulation)
    nom_client = models.CharField(max_length=100, blank=True, verbose_name="Nom")
    prenom_client = models.CharField(max_length=100, blank=True, verbose_name="Prénom")
    email_client = EncryptedCharField(max_length=255, blank=True, verbose_name="Email")
    telephone_client = EncryptedCharField(max_length=255, blank=True, verbose_name="Téléphone")
    
    # Index aveugles pour la recherche exacte sur champs chiffrés (SHA-256 salé)
    email_client_hash = models.CharField(max_length=64, blank=True, db_index=True)
    telephone_client_hash = models.CharField(max_length=64, blank=True, db_index=True)

    # Suite
    date_octroi = models.DateField(null=True, blank=True)
    date_premiere_echeance = models.DateField(null=True, blank=True)
    numero_compte = EncryptedCharField(max_length=255, null=True, blank=True, verbose_name="N° compte")
    profession = models.CharField(max_length=100, null=True, blank=True)
    employeur = models.CharField(max_length=150, null=True, blank=True)
    situation_matrimoniale = models.CharField(max_length=50, null=True, blank=True)
    adresse_postale = EncryptedCharField(max_length=255, null=True, blank=True, verbose_name="Adresse postale")
    lieu_naissance = models.CharField(max_length=100, null=True, blank=True)
    titre_assure = models.CharField(
        max_length=20, null=True, blank=True,
        choices=[('M', 'Monsieur'), ('MME', 'Madame'), ('MLLE', 'Mademoiselle')],
        help_text="Civilité de l'assuré"
    )
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    date_validation = models.DateTimeField(null=True, blank=True, verbose_name="Date de validation")
    
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")
    user_agent = models.CharField(max_length=255, blank=True, verbose_name="User Agent")

    # Mode support : marqué automatiquement quand un admin NSIA simule
    # pour une banque. Ces simulations sont exclues des statistiques.
    est_test = models.BooleanField(
        default=False,
        verbose_name="Simulation de test",
        help_text="True = simulation de test/support NSIA, exclue des stats"
    )

    # --- Champs existants emprunteur (inchangés) ---
    numero_convention = models.CharField(
        max_length=50, null=True, blank=True,
        help_text="Numéro de convention banque (ex: 1000359)"
    )
    type_pret = models.CharField(
        max_length=100,
        choices=[
            ('amortissement_standard', 'Amortissement Standard'),
            ('in_fine', 'In Fine'),
            ('progressif', 'Progressif'),
            ('libre', 'Libre')
        ],
        default='amortissement_standard',
        help_text="Type de remboursement du prêt"
    )
    taux_interet = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Taux d'intérêt du prêt en %"
    )

    # Notes
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    
    class Meta:
        verbose_name = "Simulation"
        verbose_name_plural = "Simulations"
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['banque', 'produit', 'statut']),
            models.Index(fields=['reference']),
            models.Index(fields=['gestionnaire', '-date_creation']),
            models.Index(fields=['-date_creation']),
            models.Index(fields=['est_test', 'banque']),
        ]
    
    def __str__(self):
        return f"{self.reference} - {self.get_produit_display()} ({self.get_statut_display()})"
    
    def generer_reference(self):
        """
        Génère une référence unique pour la simulation
        Format: SIM-{CODE_BANQUE}-{YYYYMMDD}-{COUNTER}
        """
        if not self.reference:
            from django.db.models import Count
            
            date_str = timezone.now().strftime('%Y%m%d')
            code_banque = self.banque.code_banque if self.banque else 'NSIA'
            
            # Compter les simulations du jour pour cette banque
            count = Simulation.objects.filter(
                banque=self.banque,
                reference__startswith=f'SIM-{code_banque}-{date_str}'
            ).count()
            
            counter = str(count + 1).zfill(3)
            self.reference = f'SIM-{code_banque}-{date_str}-{counter}'
        
        return self.reference
    
    def save(self, *args, **kwargs):
        """Override save pour générer la référence et détecter le mode test"""
        if not self.reference:
            self.generer_reference()

        # Auto-remplir l'agence depuis le gestionnaire
        if self.gestionnaire and self.gestionnaire.agence:
            self.agence = self.gestionnaire.agence

        # Auto-détecter le mode test :
        # Si le gestionnaire est un ADMIN_NSIA ou SUPER_ADMIN qui simule
        # pour une banque, c'est forcément du support/test.
        if self.gestionnaire and not self.pk:  # Seulement à la création
            role = getattr(self.gestionnaire, 'role', '')
            if role in ('SUPER_ADMIN', 'ADMIN_NSIA'):
                self.est_test = True

        # Générer les hachages aveugles pour l'email et le téléphone
        if self.email_client:
            self.email_client_hash = hash_value(self.email_client)
        else:
            self.email_client_hash = ''

        if self.telephone_client:
            self.telephone_client_hash = hash_value(self.telephone_client)
        else:
            self.telephone_client_hash = ''

        super().save(*args, **kwargs)
    
    def marquer_comme_calculee(self, resultats):
        """Marque la simulation comme calculée avec les résultats"""
        self.resultats_calcul = resultats
        self.statut = 'calculee'
        self.save()
    
    def marquer_comme_validee(self):
        """Valide la simulation"""
        self.statut = 'validee'
        self.date_validation = timezone.now()
        self.save()
    
    def peut_etre_convertie(self):
        """Vérifie si la simulation peut être convertie en souscription"""
        return self.statut == 'validee' and not hasattr(self, 'souscription')
    
    def get_montant_prime(self):
        """Retourne le montant de la prime totale calculée"""
        return self.resultats_calcul.get('prime_totale', 0)
    
    def get_donnees_client(self):
        """Retourne les données client sous forme de dict"""
        return {
            'nom': self.nom_client,
            'prenom': self.prenom_client,
            'email': self.email_client,
            'telephone': self.telephone_client,
        }

    def clean(self):
            """Validation personnalisée"""
            super().clean()
            
            # Vérifier que l'agence appartient à la banque
            if self.agence and self.banque and self.agence.banque != self.banque:
                raise ValidationError({
                    'agence': "L'agence doit appartenir à la banque de la simulation"
                })


    def get_nom_complet_client(self):
        """Retourne le nom complet du client"""
        return f"{self.prenom_client} {self.nom_client}"

    def get_titre_complet(self):
        """Retourne le titre complet (ex: 'Monsieur')"""
        titres = {'M': 'Monsieur', 'MME': 'Madame', 'MLLE': 'Mademoiselle'}
        return titres.get(self.titre_assure, '') if self.titre_assure else ''

    def get_type_pret_display_complet(self):
        """Retourne le type de prêt complet"""
        return dict(self._meta.get_field('type_pret').choices).get(
            self.type_pret,
            self.type_pret
        )

    def get_total_beneficiaires(self):
        """Retourne le nombre de bénéficiaires"""
        return self.beneficiaires.count()

    def get_beneficiaires_ordonnes(self):
        """Retourne les bénéficiaires triés par ordre"""
        return self.beneficiaires.all().order_by('ordre')

class Souscription(models.Model):
    """
    Souscription (conversion d'une simulation en contrat)
    Contient les informations complètes pour émission du contrat
    """
    objects = TenantManager()  # Activation de l'isolation multi-tenant ORM
    
    # Statuts de souscription
    STATUT_CHOICES = [
        ('en_cours', 'En cours de traitement'),
        ('validee', 'Validée'),
        ('rejetee', 'Rejetée'),
        ('suspendue', 'Suspendue'),
        ('active', 'Active'),
        ('resiliee', 'Résiliée'),
    ]
    
    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Référence",
        help_text="Ex: SOUSCR-BGFI-20250106-001"
    )
    
    # Relation avec simulation (OneToOne)
    simulation = models.OneToOneField(
        Simulation,
        on_delete=models.PROTECT,
        related_name='souscription',
        verbose_name="Simulation d'origine"
    )
    
    # Relations
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        related_name='souscriptions',
        verbose_name="Banque"
    )
    
    gestionnaire = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='souscriptions_gerees',
        verbose_name="Gestionnaire"
    )
    
    # Statut
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_cours',
        verbose_name="Statut"
    )
    
    # Informations souscripteur (COMPLÈTES)
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, verbose_name="Prénom")
    date_naissance = models.DateField(verbose_name="Date de naissance")
    lieu_naissance = models.CharField(max_length=100, blank=True, verbose_name="Lieu de naissance")
    
    email = EncryptedCharField(max_length=255, verbose_name="Email")
    telephone = EncryptedCharField(max_length=255, verbose_name="Téléphone")
    adresse = EncryptedTextField(verbose_name="Adresse postale")
    
    # Index aveugles pour la recherche exacte
    email_hash = models.CharField(max_length=64, blank=True, db_index=True)
    telephone_hash = models.CharField(max_length=64, blank=True, db_index=True)
    
    profession = models.CharField(max_length=100, blank=True, verbose_name="Profession")
    employeur = models.CharField(max_length=200, blank=True, verbose_name="Employeur")
    
    # Numéro de compte bancaire
    numero_compte = EncryptedCharField(max_length=255, blank=True, verbose_name="N° compte")
    
    # Documents attachés (URLs ou chemins)
    documents = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Documents attachés",
        help_text="Liste des documents fournis (CNI, justificatifs...)"
    )
    
    # Informations contrat
    numero_police = models.CharField(
        max_length=50,
        blank=True,
        unique=True,
        null=True,
        verbose_name="Numéro de police"
    )
    
    date_effet_contrat = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'effet du contrat"
    )
    
    date_echeance_contrat = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'échéance du contrat"
    )
    
    # Montants
    montant_prime = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Montant de la prime (FCFA)"
    )
    
    # Données spécifiques produit (JSON flexible)
    donnees_produit = models.JSONField(
        default=dict,
        verbose_name="Données spécifiques au produit"
    )
    
    # Dates importantes
    date_souscription = models.DateTimeField(auto_now_add=True, verbose_name="Date de souscription")
    date_validation = models.DateTimeField(null=True, blank=True, verbose_name="Date de validation")
    date_rejet = models.DateTimeField(null=True, blank=True, verbose_name="Date de rejet")
    
    # Motif de rejet (si applicable)
    motif_rejet = models.TextField(blank=True, verbose_name="Motif de rejet")
    
    # Notes et commentaires
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    commentaires = models.TextField(blank=True, verbose_name="Commentaires")
    
    # Métadonnées
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Souscription"
        verbose_name_plural = "Souscriptions"
        ordering = ['-date_souscription']
        indexes = [
            models.Index(fields=['banque', 'statut']),
            models.Index(fields=['reference']),
            models.Index(fields=['numero_police']),
            models.Index(fields=['-date_souscription']),
        ]
    
    def __str__(self):
        return f"{self.reference} - {self.nom} {self.prenom} ({self.get_statut_display()})"
    
    def generer_reference(self):
        """
        Génère une référence unique pour la souscription
        Format: SOUSCR-{CODE_BANQUE}-{YYYYMMDD}-{COUNTER}
        """
        if not self.reference:
            from django.db.models import Count
            
            date_str = timezone.now().strftime('%Y%m%d')
            code_banque = self.banque.code_banque if self.banque else 'NSIA'
            
            # Compter les souscriptions du jour pour cette banque
            count = Souscription.objects.filter(
                banque=self.banque,
                reference__startswith=f'SOUSCR-{code_banque}-{date_str}'
            ).count()
            
            counter = str(count + 1).zfill(3)
            self.reference = f'SOUSCR-{code_banque}-{date_str}-{counter}'
        
        return self.reference
    
    def save(self, *args, **kwargs):
        """Override save pour générer la référence automatiquement"""
        if not self.reference:
            self.generer_reference()
        
        # Copier le montant depuis la simulation si pas défini
        if not self.montant_prime and self.simulation:
            self.montant_prime = self.simulation.get_montant_prime()
        
        # Générer les hachages aveugles pour l'email et le téléphone
        if self.email:
            self.email_hash = hash_value(self.email)
        else:
            self.email_hash = ''

        if self.telephone:
            self.telephone_hash = hash_value(self.telephone)
        else:
            self.telephone_hash = ''
            
        super().save(*args, **kwargs)
        
        # Marquer la simulation comme convertie
        if self.simulation and self.simulation.statut != 'convertie':
            self.simulation.statut = 'convertie'
            self.simulation.save()
    
    def valider(self, numero_police=None):
        """Valide la souscription et génère le numéro de police"""
        self.statut = 'validee'
        self.date_validation = timezone.now()
        
        if numero_police:
            self.numero_police = numero_police
        elif not self.numero_police:
            # Générer automatiquement le numéro de police
            self.numero_police = self.generer_numero_police()
        
        self.save()
    
    def rejeter(self, motif):
        """Rejette la souscription avec un motif"""
        self.statut = 'rejetee'
        self.date_rejet = timezone.now()
        self.motif_rejet = motif
        self.save()
    
    def generer_numero_police(self):
        """
        Génère un numéro de police unique
        Format: POL-{CODE_BANQUE}-{ANNEE}-{COUNTER}
        """
        annee = timezone.now().year
        code_banque = self.banque.code_banque if self.banque else 'NSIA'
        
        count = Souscription.objects.filter(
            banque=self.banque,
            numero_police__startswith=f'POL-{code_banque}-{annee}'
        ).count()
        
        counter = str(count + 1).zfill(5)
        return f'POL-{code_banque}-{annee}-{counter}'
    
    def get_age_souscripteur(self):
        """Calcule l'âge du souscripteur"""
        if self.date_naissance:
            today = timezone.now().date()
            age = today.year - self.date_naissance.year
            
            # Ajuster si l'anniversaire n'est pas encore passé cette année
            if (today.month, today.day) < (self.date_naissance.month, self.date_naissance.day):
                age -= 1
            
            return age
        return None

class QuestionnaireMedical(models.Model):
    """
    Questionnaire médical pour évaluation du risque de santé
    Lié en OneToOne avec une Simulation
    """
    objects = TenantManager()  # Isolation multi-tenant ORM
    
    # ============================================
    # LIAISON AVEC SIMULATION
    # ============================================
    simulation = models.OneToOneField(
        'simulateur.Simulation',
        on_delete=models.CASCADE,
        related_name='questionnaire_medical',
        verbose_name="Simulation liée"
    )
    
    date_remplissage = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de remplissage"
    )
    
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    
    # ============================================
    # SECTION 1 : DONNÉES PHYSIQUES
    # ============================================
    taille_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('50')), MaxValueValidator(Decimal('250'))],
        verbose_name="Taille (cm)",
        help_text="Taille en centimètres (ex: 175.5)"
    )
    
    poids_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('20')), MaxValueValidator(Decimal('300'))],
        verbose_name="Poids (kg)",
        help_text="Poids en kilogrammes (ex: 75.5)"
    )
    
    imc = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        editable=False,
        null=True,
        blank=True,
        verbose_name="IMC (Indice de Masse Corporelle)",
        help_text="Calculé automatiquement : poids / (taille^2)"
    )
    
    tension_arterielle = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Tension artérielle",
        help_text="Format: 120/80 (optionnel)"
    )
    
    # ============================================
    # SECTION 2 : HABITUDES DE VIE
    # ============================================
    fumeur = models.BooleanField(
        default=False,
        verbose_name="Fumeur"
    )
    
    nb_cigarettes_jour = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Nombre de cigarettes par jour",
        help_text="Si fumeur, indiquer le nombre (0-100)"
    )
    
    consomme_alcool = models.BooleanField(
        default=False,
        verbose_name="Consomme de l'alcool régulièrement"
    )
    
    distractions = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Distractions / Loisirs",
        help_text="Activités de loisirs (optionnel)"
    )
    
    pratique_sport = models.BooleanField(
        default=False,
        verbose_name="Pratique du sport"
    )
    
    type_sport = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Type de sport pratiqué",
        help_text="Si sport, préciser lequel"
    )
    
    # ============================================
    # SECTION 3 : ANTÉCÉDENTS MÉDICAUX (15 QUESTIONS)
    # ============================================
    a_infirmite = models.BooleanField(
        default=False,
        verbose_name="Êtes-vous atteint d'une infirmité ?"
    )
    
    malade_6_derniers_mois = models.BooleanField(
        default=False,
        verbose_name="Avez-vous été malade au cours des 6 derniers mois ?"
    )
    
    souvent_fatigue = models.BooleanField(
        default=False,
        verbose_name="Êtes-vous souvent fatigué(e) ?"
    )
    
    perte_poids_recente = models.BooleanField(
        default=False,
        verbose_name="Avez-vous maigri depuis les 6 derniers mois ?"
    )
    
    prise_poids_recente = models.BooleanField(
        default=False,
        verbose_name="Avez-vous grossi depuis les 6 derniers mois ?"
    )
    
    a_ganglions = models.BooleanField(
        default=False,
        verbose_name="Avez-vous des ganglions, des furoncles, des abcès ou des maladies de la peau ?"
    )
    
    fievre_persistante = models.BooleanField(
        default=False,
        verbose_name="Toussez-vous depuis quelques temps avec en plus de la fièvre ?"
    )
    
    plaies_buccales = models.BooleanField(
        default=False,
        verbose_name="Avez-vous des plaies dans la bouche ?"
    )
    
    diarrhee_frequente = models.BooleanField(
        default=False,
        verbose_name="Faites-vous souvent la diarrhée ?"
    )
    
    ballonnement = models.BooleanField(
        default=False,
        verbose_name="Êtes-vous souvent ballonné(e) ?"
    )
    
    oedemes_membres_inferieurs = models.BooleanField(
        default=False,
        verbose_name="Avez-vous eu des œdèmes des Membres Inférieurs (O.M.I) ?"
    )
    
    essoufflement = models.BooleanField(
        default=False,
        verbose_name="Êtes-vous essoufflé(e) au moindre effort ?"
    )
    
    a_eu_perfusion = models.BooleanField(
        default=False,
        verbose_name="Avez-vous déjà reçu une perfusion ?"
    )
    
    a_eu_transfusion = models.BooleanField(
        default=False,
        verbose_name="Avez-vous déjà reçu une transfusion de sang ?"
    )
    
    infos_complementaires = EncryptedTextField(
        blank=True,
        verbose_name="Informations complémentaires sur votre état de santé",
        help_text="Toute information médicale pertinente (optionnel)"
    )
    
    # ============================================
    # RÉSULTATS DU CALCUL DE RISQUE
    # ============================================
    score_risque = models.IntegerField(
        default=0,
        editable=False,
        verbose_name="Score de risque",
        help_text="Points calculés automatiquement (0-30+)"
    )
    
    taux_surprime = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Taux de surprime (%)",
        help_text="Pourcentage de surprime calculé (0-20%)"
    )
    
    CATEGORIE_CHOICES = [
        ('FAIBLE', 'Risque faible'),
        ('MODERE', 'Risque modéré'),
        ('ELEVE', 'Risque élevé'),
        ('TRES_ELEVE', 'Risque très élevé'),
    ]
    
    categorie_risque = models.CharField(
        max_length=20,
        choices=CATEGORIE_CHOICES,
        default='FAIBLE',
        editable=False,
        verbose_name="Catégorie de risque"
    )
    
    # ============================================
    # STATUT DE VALIDATION
    # ============================================
    STATUT_CHOICES = [
        ('en_attente', 'En attente d\'analyse'),
        ('accepte', 'Accepté'),
        ('expertise_requise', 'Expertise médicale requise'),
        ('refuse', 'Refusé'),
    ]
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente',
        verbose_name="Statut de validation"
    )
    
    commentaire_medical = EncryptedTextField(
        blank=True,
        verbose_name="Commentaire médical",
        help_text="Remarques du validateur médical (si expertise requise)"
    )
    
    # ============================================
    # MÉTADONNÉES
    # ============================================
    createur = models.ForeignKey(
        'core.Utilisateur',
        on_delete=models.SET_NULL,
        null=True,
        related_name='questionnaires_crees',
        verbose_name="Créé par"
    )
    
    class Meta:
        db_table = 'questionnaire_medical'
        verbose_name = "Questionnaire médical"
        verbose_name_plural = "Questionnaires médicaux"
        ordering = ['-date_remplissage']
    
    def __str__(self):
        return f"Q2 - {self.simulation.reference} - {self.categorie_risque}"
    
    def save(self, *args, **kwargs):
        """
        Override save pour calculer l'IMC automatiquement
        """
        if self.taille_cm and self.poids_kg:
            # Calcul IMC = poids (kg) / taille (m)^2
            taille_m = self.taille_cm / Decimal('100')
            self.imc = self.poids_kg / (taille_m ** 2)
            self.imc = round(self.imc, 2)
        
        super().save(*args, **kwargs)
    
    def get_categorie_imc(self):
        """
        Retourne la catégorie IMC selon les normes OMS
        """
        if not self.imc:
            return "Non calculé"
        
        imc = float(self.imc)
        if imc < 18.5:
            return "Dénutrition"
        elif 18.5 <= imc < 25:
            return "Normal"
        elif 25 <= imc < 30:
            return "Surpoids"
        else:
            return "Obésité"
    
    def compter_antecedents(self):
        """
        Compte le nombre de réponses "Oui" aux questions médicales
        """
        champs_medicaux = [
            self.a_infirmite,
            self.malade_6_derniers_mois,
            self.souvent_fatigue,
            self.perte_poids_recente,
            self.prise_poids_recente,
            self.a_ganglions,
            self.fievre_persistante,
            self.plaies_buccales,
            self.diarrhee_frequente,
            self.ballonnement,
            self.oedemes_membres_inferieurs,
            self.essoufflement,
            self.a_eu_perfusion,
            self.a_eu_transfusion,
        ]
        return sum(1 for champ in champs_medicaux if champ)
    
    def est_fumeur_lourd(self):
        """
        Détermine si le fumeur est considéré comme "lourd" (> 10 cig/jour)
        """
        return self.fumeur and self.nb_cigarettes_jour and self.nb_cigarettes_jour > 10

class Beneficiaire(models.Model):
    """
    Bénéficiaires en cas de décès pour l'assurance emprunteur
    
    Section du BIA : "BENEFICIAIRES en Cas de Décès"
    
    Tableau du BIA :
    | En qualité de        | Nom et Prénoms     | Part (%) |
    |----------------------|--------------------|----------|
    | Organisme de prêt    | Ecobank CONGO      | 100      |
    
    Règles :
    - La somme des parts doit être EXACTEMENT 100%
    - Au moins un bénéficiaire doit être défini
    - Le bénéficiaire principal est généralement l'organisme de prêt (100%)
    """
    objects = TenantManager()  # Isolation multi-tenant ORM
    
    # ============================================
    # LIAISONS
    # ============================================
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    simulation = models.ForeignKey(
        'simulateur.Simulation',
        on_delete=models.CASCADE,
        related_name='beneficiaires',
        verbose_name="Simulation liée"
    )
    
    # ============================================
    # INFORMATIONS BÉNÉFICIAIRE
    # ============================================
    QUALITE_CHOICES = [
        ('organisme_pret', 'Organisme de prêt'),
        ('conjoint', 'Conjoint'),
        ('enfant', 'Enfant'),
        ('parent', 'Parent'),
        ('frere_soeur', 'Frère/Sœur'),
        ('enfant_nee', 'Enfant née'),
        ('enfant_a_naitre', 'Enfant à naitre'),
        ('autre', 'Autre'),
        ('assure', 'Assuré')
    ]
    
    qualite = models.CharField(
        max_length=50,
        choices=QUALITE_CHOICES,
        verbose_name="En qualité de",
        help_text="Relation du bénéficiaire avec l'assuré"
    )
    
    nom_prenoms = models.CharField(
        max_length=200,
        verbose_name="Nom et Prénoms",
        help_text="Nom complet du bénéficiaire (ex: 'DUPONT Jean Pierre')"
    )
    
    part_pourcentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.01')),
            MaxValueValidator(Decimal('100.00'))
        ],
        verbose_name="Part (%)",
        help_text="Pourcentage de la garantie (ex: 100.00 pour 100%)"
    )
    
    # ============================================
    # ORDRE D'AFFICHAGE
    # ============================================
    ordre = models.IntegerField(
        default=1,
        verbose_name="Ordre d'affichage",
        help_text="Ordre d'affichage dans le BIA (1, 2, 3...)"
    )
    
    # ============================================
    # MÉTADONNÉES
    # ============================================
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    
    class Meta:
        db_table = 'beneficiaires'
        verbose_name = "Bénéficiaire"
        verbose_name_plural = "Bénéficiaires"
        ordering = ['simulation', 'ordre']
    
    def __str__(self):
        return f"{self.get_qualite_display()} - {self.nom_prenoms} ({self.part_pourcentage}%)"
    
    def clean(self):
        """
        Validation : Vérifier que la somme des parts ne dépasse pas 100%
        """
        super().clean()
        
        # Vérifier que la part est positive
        if self.part_pourcentage <= 0:
            raise ValidationError({
                'part_pourcentage': "La part doit être supérieure à 0%"
            })
        
        # Vérifier la somme totale des parts pour cette simulation
        if self.simulation_id:
            # Calculer la somme actuelle (en excluant cette instance si elle existe déjà)
            autres_beneficiaires = Beneficiaire.objects.filter(
                simulation=self.simulation
            ).exclude(id=self.id)
            
            total_autres = sum(
                b.part_pourcentage for b in autres_beneficiaires
            )
            
            total_avec_celui_ci = total_autres + self.part_pourcentage
            
            if total_avec_celui_ci > Decimal('100.00'):
                raise ValidationError({
                    'part_pourcentage': f"La somme des parts dépasse 100% ({total_avec_celui_ci}%). "
                                       f"Total des autres bénéficiaires : {total_autres}%"
                })
    
    @classmethod
    def valider_somme_parts(cls, simulation):
        """
        Valide que la somme des parts pour une simulation est exactement 100%
        
        Args:
            simulation: Instance de Simulation
            
        Returns:
            tuple: (bool, str) - (is_valid, message)
        """
        beneficiaires = cls.objects.filter(simulation=simulation)
        
        if not beneficiaires.exists():
            return False, "Aucun bénéficiaire défini"
        
        total = sum(b.part_pourcentage for b in beneficiaires)
        
        # Tolérance de 0.01% pour les erreurs d'arrondi
        if abs(total - Decimal('100.00')) < Decimal('0.01'):
            return True, f"Total des parts : {total}%"
        else:
            return False, f"Total des parts doit être 100% (actuellement : {total}%)"
    
    @classmethod
    def creer_beneficiaire_par_defaut(cls, simulation):
        """
        Crée un bénéficiaire par défaut (organisme de prêt à 100%)
        
        Args:
            simulation: Instance de Simulation
            
        Returns:
            Beneficiaire: Instance créée
        """
        if simulation.produit == 'retraite':
            return cls.objects.create(
            simulation=simulation,
            qualite='assure',
            nom_prenoms=f"{simulation.nom_client} {simulation.prenom_client}",
            part_pourcentage=Decimal('100.00'),
            ordre=1
        )
        elif simulation.produit == 'emprunteur':
            return cls.objects.create(
                simulation=simulation,
                qualite='organisme_pret',
                nom_prenoms=f"{simulation.banque.nom_complet}",
                part_pourcentage=Decimal('100.00'),
                ordre=1
            )
        return None
    
class DetailQ2(models.Model):
    """
    Détails médicaux pour chaque question du questionnaire Q2 avec réponse OUI
    
    Pour chaque question médicale où l'assuré répond "OUI", le BIA exige :
    - Précisez : Nature exacte de l'affection/maladie
    - Période du traitement : Date début - Date fin (ou "en cours")
    - Lieu du traitement : Hôpital/clinique où le traitement a eu lieu
    
    Exemple :
    Question: "Avez-vous été malade au cours des 6 derniers mois ?" → OUI
    Détails:
      - Précisez: "Pneumonie bactérienne"
      - Période: "Janvier 2025 - Février 2025"
      - Lieu: "CHU de Brazzaville"
    """
    objects = TenantManager()  # Isolation multi-tenant ORM
    
    # ============================================
    # LIAISONS
    # ============================================
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    questionnaire = models.ForeignKey(
        'simulateur.QuestionnaireMedical',
        on_delete=models.CASCADE,
        related_name='details_medicaux',
        verbose_name="Questionnaire lié"
    )
    
    # ============================================
    # IDENTIFICATION DE LA QUESTION
    # ============================================
    question_field = models.CharField(
        max_length=100,
        verbose_name="Champ de la question",
        help_text="Nom technique du champ (ex: 'a_infirmite', 'malade_6_derniers_mois')"
    )
    
    question_label = models.CharField(
        max_length=200,
        verbose_name="Libellé de la question",
        help_text="Texte de la question affichée (ex: 'Êtes-vous atteint d\\'une infirmité ?')"
    )
    
    # ============================================
    # DÉTAILS MÉDICAUX (colonnes du BIA)
    # ============================================
    precisez = models.TextField(
        verbose_name="Précisez",
        help_text="Nature exacte de l'affection/maladie (diagnostic)"
    )
    
    periode_traitement = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Période du traitement",
        help_text="Ex: 'Mars 2023 - en cours' ou 'Janvier 2024 - Février 2024'"
    )
    
    lieu_traitement = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Lieu du traitement",
        help_text="Hôpital/clinique où le traitement a eu lieu (ex: 'CHU de Brazzaville')"
    )
    
    # ============================================
    # MÉTADONNÉES
    # ============================================
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    
    class Meta:
        db_table = 'details_q2'
        verbose_name = "Détail médical Q2"
        verbose_name_plural = "Détails médicaux Q2"
        ordering = ['date_creation']
        unique_together = [['questionnaire', 'question_field']]  # Un seul détail par question
    
    def __str__(self):
        return f"{self.question_label[:50]} - {self.precisez[:30]}"
    
    def clean(self):
        """
        Validation : Le champ question_field doit correspondre à un champ OUI dans le questionnaire
        """
        super().clean()
        
        # Vérifier que la question existe dans QuestionnaireMedical
        questions_valides = [
            'a_infirmite',
            'malade_6_derniers_mois',
            'souvent_fatigue',
            'perte_poids_recente',
            'prise_poids_recente',
            'a_ganglions',
            'fievre_persistante',
            'plaies_buccales',
            'diarrhee_frequente',
            'ballonnement',
            'oedemes_membres_inferieurs',
            'essoufflement',
            'a_eu_perfusion',
            'a_eu_transfusion',
        ]
        
        if self.question_field not in questions_valides:
            raise ValidationError({
                'question_field': f"Question invalide. Doit être parmi : {', '.join(questions_valides)}"
            })
        
        # Vérifier que la réponse est bien OUI dans le questionnaire
        if hasattr(self.questionnaire, self.question_field):
            valeur = getattr(self.questionnaire, self.question_field)
            if not valeur:  # Si False
                raise ValidationError({
                    'question_field': f"La question '{self.question_field}' a une réponse NON. Les détails ne sont requis que pour les réponses OUI."
                })




