"""
Modèles pour les tables tarifaires
Tables de référence pour les calculs de primes
"""
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

from apps.core.models import Banque


# ============================================
# CALLABLES DYNAMIQUES POUR limit_choices_to
# Remplacent les listes de codes banques en dur.
# Le dropdown admin se met à jour automatiquement
# quand on lie une banque à un produit via ProduitBanque.
# ============================================

def banques_avec_elikia():
    """Retourne dynamiquement les banques ayant le produit Elikia actif"""
    from apps.core.models import ProduitBanque
    return {
        'id__in': ProduitBanque.objects.filter(
            produit__code='elikia',
            est_actif=True
        ).values_list('banque_id', flat=True)
    }


def banques_avec_mobateli():
    """Retourne dynamiquement les banques ayant le produit Mobateli actif"""
    from apps.core.models import ProduitBanque
    return {
        'id__in': ProduitBanque.objects.filter(
            produit__code='mobateli',
            est_actif=True
        ).values_list('banque_id', flat=True)
    }


# apps/tarification/models.py

class TableTauxEmprunteur(models.Model):
    """
    Table des taux pour l'assurance emprunteur (ADI)
    Organisée par tranches d'âge et durée du prêt
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Tranche d'âge
    tranche_age = models.CharField(max_length=20, verbose_name="Tranche d'âge", help_text="Ex: 29-39")
    age_min = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(100)])
    age_max = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(100)])
    
    # Durée du prêt (FLEXIBLE)
    duree_annees = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(30)], 
        verbose_name="Durée (années)",
        null=True,
        blank=True,
        help_text="Laisser vide si durée en mois"
    )
    duree_mois = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(360)], 
        verbose_name="Durée (mois)",
        null=True,
        blank=True,
        help_text="Laisser vide si durée en années"
    )
    
    # Taux applicable (en pourcentage)
    taux_pourcentage = models.DecimalField(
        max_digits=6, 
        decimal_places=3, 
        verbose_name="Taux (%)", 
        help_text="Ex: 0.370 pour 0.37%"
    )
    
    # Frais accessoires (forfaitaires)
    frais_accessoires = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Frais accessoires (FCFA)",
        help_text="Frais forfaitaires selon convention"
    )
    
    # Produit concerné
    produit = models.CharField(
        max_length=50,
        default='emprunteur',
        verbose_name="Produit",
        help_text="emprunteur, epargne_plus, etc."
    )
    
    # Banque spécifique (nullable si tarif général)
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='taux_emprunteur',
        verbose_name="Banque spécifique"
    )
    
    # Dates de validité
    date_debut_validite = models.DateField(verbose_name="Date début validité", null=True, blank=True)
    date_fin_validite = models.DateField(null=True, blank=True, verbose_name="Date fin validité")
    
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Taux Emprunteur"
        verbose_name_plural = "Taux Emprunteur"
        ordering = ['age_min', 'duree_annees', 'duree_mois']
        indexes = [
            models.Index(fields=['age_min', 'age_max', 'duree_annees', 'duree_mois']),
            models.Index(fields=['produit', 'actif', 'banque']),
        ]
    
    def __str__(self):
        duree_str = f"{self.duree_annees} ans" if self.duree_annees else f"{self.duree_mois} mois"
        banque_str = f" ({self.banque.nom_court})" if self.banque else " (Général)"
        return f"{self.tranche_age} - {duree_str} : {self.taux_pourcentage}%{banque_str}"
    
    def get_duree_en_mois(self):
        """Retourne la durée en mois (utile pour les calculs)"""
        if self.duree_mois:
            return self.duree_mois
        elif self.duree_annees:
            return self.duree_annees * 12
        return 0


class TableCIMA_H(models.Model):
    """
    Table CIMA H pour les calculs actuariels (Retraite)
    Table de mortalité et valeurs actuarielles
    """
    
    # Âge (x)
    x = models.IntegerField(primary_key=True, validators=[MinValueValidator(0), MaxValueValidator(120)], verbose_name="Âge (x)")
    
    # Valeurs actuarielles
    Nx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="Nx")
    Mx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="Mx")
    Dx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="Dx")
    lx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="lx")
    dxx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="dxx")
    qx = models.DecimalField(max_digits=15, decimal_places=10, verbose_name="qx")
    Cx = models.DecimalField(max_digits=15, decimal_places=6, verbose_name="Cx")
    
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Table CIMA H"
        verbose_name_plural = "Tables CIMA H"
        ordering = ['x']
    
    def __str__(self):
        return f"CIMA H - Âge {self.x}"


class TableCIMA_F(models.Model):
    """
    Table CIMA Femmes - Utilisée pour PENSIONS (Sécurité, Confort, Renfort)
    Champs extraits du code Python PENSIONS
    """
    x = models.IntegerField("Âge", primary_key=True)  # Âge
    lx = models.DecimalField("lx - Survivants", max_digits=12, decimal_places=2)  # Nombre de survivants
    dxx = models.DecimalField("dx - Décès", max_digits=12, decimal_places=2)  # Nombre de décès
    qx = models.DecimalField("qx - Probabilité décès", max_digits=10, decimal_places=8)  # Probabilité de décès
    Dx = models.DecimalField("Dx - Valeur actualisée survivants", max_digits=15, decimal_places=2)  # Valeur actualisée
    Nx = models.DecimalField("Nx - Somme Dx", max_digits=15, decimal_places=2)  # Somme des Dx
    Cx = models.DecimalField("Cx - Valeur actualisée décès", max_digits=15, decimal_places=2)  # Valeur actualisée décès
    Mx = models.DecimalField("Mx - Somme Cx", max_digits=15, decimal_places=2)  # Somme des Cx
    
    class Meta:
        db_table = 'simulateur_cima_f'
        verbose_name = "Table CIMA Femmes"
        verbose_name_plural = "Tables CIMA Femmes"
    
    def __str__(self):
        return f"CIMA F - Âge {self.x}"


class TablePrimesEtudes(models.Model):
    """
    Table des primes pour le produit Confort Études
    Primes précalculées selon âge parent, durée paiement, durée rente
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Paramètres
    age = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)], verbose_name="Âge parent")
    duree_paiement = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(30)], verbose_name="Durée paiement (années)")
    duree_rente = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(20)], verbose_name="Durée rente (années)")
    
    # Type de prime
    TYPE_CHOICES = [
        ('ANNUELLE', 'Prime Annuelle'),
        ('UNIQUE', 'Prime Unique'),
    ]
    type_prime = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type de prime")
    
    # Produit (montant de rente)
    PRODUIT_CHOICES = [
        ('100k', '100 000 FCFA'),
        ('200k', '200 000 FCFA'),
        ('300k', '300 000 FCFA'),
        ('500k', '500 000 FCFA'),
        ('750k', '750 000 FCFA'),
        ('1M', '1 000 000 FCFA'),
        ('1.5M', '1 500 000 FCFA'),
        ('2M', '2 000 000 FCFA'),
        ('2.5M', '2 500 000 FCFA'),
        ('3M', '3 000 000 FCFA'),
    ]
    produit = models.CharField(max_length=10, choices=PRODUIT_CHOICES, verbose_name="Produit (Rente)")
    
    # Montant de la prime
    montant = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Montant prime")
    
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Prime Études"
        verbose_name_plural = "Primes Études"
        ordering = ['age', 'duree_paiement', 'type_prime']
        unique_together = ['age', 'duree_paiement', 'duree_rente', 'type_prime', 'produit']
        indexes = [
            models.Index(fields=['age', 'duree_paiement', 'duree_rente', 'produit']),
        ]
    
    def __str__(self):
        return f"Études - Âge {self.age} - {self.duree_paiement}ans - {self.produit} - {self.type_prime}"


class TableTauxMensuels(models.Model):
    """
    Table des taux mensuels pour conversion prime annuelle → mensuelle (Études)
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Paramètres
    age = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)], verbose_name="Âge parent")
    duree_paiement = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(30)], verbose_name="Durée paiement (années)")
    duree_rente = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(20)], verbose_name="Durée rente (années)")
    
    produit = models.CharField(max_length=50, default='NSIA-ETUDES', verbose_name="Produit")
    
    # Taux mensuel
    taux = models.DecimalField(max_digits=10, decimal_places=8, verbose_name="Taux mensuel")
    
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Taux Mensuel"
        verbose_name_plural = "Taux Mensuels"
        ordering = ['age', 'duree_paiement']
        unique_together = ['age', 'duree_paiement', 'duree_rente', 'produit']
        indexes = [
            models.Index(fields=['age', 'duree_paiement', 'duree_rente']),
        ]
    
    def __str__(self):
        return f"Taux - Âge {self.age} - {self.duree_paiement}ans - {self.taux}"


class ParametresProduits(models.Model):
    """
    Paramètres techniques pour chaque produit
    Ex: taux d'intérêt technique, frais d'acquisition, etc.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Produit concerné
    PRODUIT_CHOICES = [
        ('emprunteur', 'Emprunteur (ADI)'),
        ('retraite', 'Confort Retraite'),
        ('etudes', 'Confort Études'),
        ('elikia', 'Elikia Scolaire'),
        ('mobateli', 'Mobateli'),
        ('epargne_plus', 'Épargne Plus'),
    ]
    produit_type = models.CharField(max_length=50, choices=PRODUIT_CHOICES, verbose_name="Type de produit")
    
    # Nom du paramètre
    param_nom = models.CharField(max_length=100, verbose_name="Nom du paramètre", help_text="Ex: taux_interet_technique")
    
    # Valeur du paramètre
    param_valeur = models.CharField(max_length=255, verbose_name="Valeur")
    
    # Type de valeur
    TYPE_VALEUR_CHOICES = [
        ('decimal', 'Décimal'),
        ('string', 'Texte'),
        ('boolean', 'Booléen'),
        ('integer', 'Entier'),
    ]
    type_valeur = models.CharField(max_length=20, choices=TYPE_VALEUR_CHOICES, default='decimal', verbose_name="Type de valeur")
    
    # Description
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Banque spécifique (si override pour une banque)
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='parametres_produits',
        verbose_name="Banque spécifique"
    )
    
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Paramètre Produit"
        verbose_name_plural = "Paramètres Produits"
        ordering = ['produit_type', 'param_nom']
        unique_together = ['produit_type', 'param_nom', 'banque']
    
    def __str__(self):
        banque_str = f" ({self.banque.code_banque})" if self.banque else ""
        return f"{self.produit_type} - {self.param_nom}{banque_str}"
    
    def get_valeur_typee(self):
        """Retourne la valeur convertie selon son type"""
        if self.type_valeur == 'decimal':
            from decimal import Decimal
            return Decimal(self.param_valeur)
        elif self.type_valeur == 'integer':
            return int(self.param_valeur)
        elif self.type_valeur == 'boolean':
            return self.param_valeur.lower() in ['true', '1', 'yes', 'oui']
        else:
            return self.param_valeur


class TablePrimesElikia(models.Model):
    """
    Grille tarifaire pour Elikia Scolaire (BCI)
    Produit : Rente éducation avec primes forfaitaires
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Montants de rente
    rente_annuelle = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Rente annuelle (FCFA)",
        help_text="Ex: 200000, 400000, 600000..."
    )
    
    # Durée de service (généralement 5 ans pour Elikia)
    duree_rente = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Durée de rente (années)"
    )
    
    # Capital garanti
    capital_garanti = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Capital garanti (FCFA)"
    )
    
    # Tranches d'âge
    tranche_age = models.CharField(
        max_length=30, 
        verbose_name="Tranche d'âge",
        help_text="Ex: 45 ans et moins, 46-55 ans, 56-64 ans"
    )
    age_min = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)])
    age_max = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)])
    
    # Prime nette annuelle (FORFAITAIRE)
    prime_nette_annuelle = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prime nette annuelle (FCFA)"
    )
    
    # Banque — filtré dynamiquement via ProduitBanque
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        related_name='primes_elikia',
        limit_choices_to=banques_avec_elikia,
        verbose_name="Banque"
    )
    
    # Métadonnées
    date_debut_validite = models.DateField(verbose_name="Date début validité", null=True, blank=True)
    date_fin_validite = models.DateField(null=True, blank=True, verbose_name="Date fin validité")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Prime Elikia Scolaire"
        verbose_name_plural = "Primes Elikia Scolaire"
        ordering = ['rente_annuelle', 'age_min']
        unique_together = ['banque', 'rente_annuelle', 'duree_rente', 'age_min', 'age_max']
        indexes = [
            models.Index(fields=['rente_annuelle', 'age_min', 'age_max']),
            models.Index(fields=['banque', 'actif']),
        ]
    
    def __str__(self):
        return f"Elikia - Rente {self.rente_annuelle} - {self.tranche_age} : {self.prime_nette_annuelle} FCFA"
    

class TablePrimesMobateli(models.Model):
    """
    Grille tarifaire pour Mobateli (BCI)
    Produit : Assurance DTC/IAD avec primes forfaitaires
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Capital DTC/IAD
    capital_dtc_iad = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Capital DTC/IAD (FCFA)",
        help_text="Ex: 2000000, 5000000, 7500000"
    )
    
    # Tranches d'âge
    tranche_age = models.CharField(
        max_length=30,
        verbose_name="Tranche d'âge",
        help_text="Ex: Moins de 45 ans, 45-54 ans, 55-64 ans"
    )
    age_min = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)])
    age_max = models.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(70)])
    
    # Prime nette (FORFAITAIRE)
    prime_nette = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prime nette (FCFA)"
    )
    
    # Banque — filtré dynamiquement via ProduitBanque
    banque = models.ForeignKey(
        'core.Banque',
        on_delete=models.CASCADE,
        related_name='primes_mobateli',
        limit_choices_to=banques_avec_mobateli,
        verbose_name="Banque"
    )
    
    # Métadonnées
    date_debut_validite = models.DateField(verbose_name="Date début validité", null=True, blank=True)
    date_fin_validite = models.DateField(null=True, blank=True, verbose_name="Date fin validité")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Prime Mobateli"
        verbose_name_plural = "Primes Mobateli"
        ordering = ['capital_dtc_iad', 'age_min']
        unique_together = ['banque', 'capital_dtc_iad', 'age_min', 'age_max']
        indexes = [
            models.Index(fields=['capital_dtc_iad', 'age_min', 'age_max']),
            models.Index(fields=['banque', 'actif']),
        ]
    
    def __str__(self):
        return f"Mobateli - Capital {self.capital_dtc_iad} - {self.tranche_age} : {self.prime_nette} FCFA"
    



# NOTE: Le modèle TableLikamaBOA a été supprimé.
# Likama = Mobateli (même produit DTC/IAD). BOA utilise TablePrimesMobateli.
# La table DB 'tarification_tablelikamaboa' reste en base mais n'est plus utilisée.



class TableEpargnePlus(models.Model):
    """
    Table de paramètres pour ÉPARGNE PLUS
    Produit d'épargne avec capitalisation d'intérêts mensuelle
    
    Caractéristiques :
    - Cotisation mensuelle minimum : 5 000 FCFA
    - Durée minimum : 5 ans (60 mois)
    - Capitalisation mensuelle des intérêts
    - Frais prélevés sur chaque prime
    - Possibilité de rachat anticipé (avec pénalité si < 10 ans)
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    banque = models.ForeignKey(
        Banque,
        on_delete=models.PROTECT,
        related_name='tables_epargne_plus',
        verbose_name="Banque"
    )
    
    # Paramètres financiers
    taux_interet_annuel = models.DecimalField(
        max_digits=6,
        decimal_places=6,
        default=Decimal('0.030400'),
        verbose_name="Taux d'intérêt annuel",
        help_text="Taux d'intérêt annuel (ex: 0.0304 pour 3.04%)"
    )
    
    taux_interet_mensuel = models.DecimalField(
        max_digits=6,
        decimal_places=6,
        default=Decimal('0.002499'),
        verbose_name="Taux d'intérêt mensuel",
        help_text="Taux d'intérêt mensuel (calculé à partir du taux annuel)"
    )
    
    # Frais
    frais_adhesion = models.IntegerField(
        default=5000,
        verbose_name="Frais d'adhésion",
        help_text="Frais d'adhésion uniques en FCFA"
    )
    
    taux_frais_gestion = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0300'),
        verbose_name="Taux frais de gestion",
        help_text="Frais de gestion sur chaque prime (ex: 0.03 pour 3%)"
    )
    
    taux_frais_acquisition = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0300'),
        verbose_name="Taux frais d'acquisition",
        help_text="Frais d'acquisition sur chaque prime (ex: 0.03 pour 3%)"
    )
    
    taux_frais_tirage = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0100'),
        verbose_name="Taux frais de tirage",
        help_text="Frais de tirage sur chaque prime (ex: 0.01 pour 1%)"
    )
    
    taux_penalite_rachat = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0500'),
        verbose_name="Taux pénalité rachat anticipé",
        help_text="Pénalité en cas de rachat anticipé (ex: 0.05 pour 5%)"
    )
    
    # Contraintes
    cotisation_minimum = models.IntegerField(
        default=5000,
        verbose_name="Cotisation minimum",
        help_text="Cotisation mensuelle minimum en FCFA"
    )
    
    duree_minimum_annees = models.IntegerField(
        default=5,
        verbose_name="Durée minimum en années",
        help_text="Durée minimum du contrat en années"
    )
    
    duree_penalite_annees = models.IntegerField(
        default=10,
        verbose_name="Durée pénalité en années",
        help_text="Durée en années avant laquelle une pénalité s'applique en cas de rachat"
    )
    
    periodicite_tirage = models.CharField(
        max_length=20,
        default='Trimestriel',
        verbose_name="Périodicité des tirages",
        help_text="Périodicité des tirages au sort (ex: Trimestriel)"
    )
    
    actif = models.BooleanField(
        default=True,
        verbose_name="Paramètres actifs"
    )
    
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'simulateur_table_epargne_plus'
        verbose_name = "Paramètres Épargne Plus"
        verbose_name_plural = "Paramètres Épargne Plus"
        ordering = ['banque__nom_court']
        unique_together = [['banque']]
        indexes = [
            models.Index(fields=['banque', 'actif']),
        ]
    
    def __str__(self):
        return f"Épargne Plus - {self.banque.nom_court} - Taux: {self.taux_interet_annuel}%"
    
    @property
    def taux_frais_total(self):
        """Calcule le taux total des frais"""
        return self.taux_frais_gestion + self.taux_frais_acquisition + self.taux_frais_tirage
    
    @property
    def taux_prime_nette(self):
        """Calcule le taux de prime nette après déduction des frais"""
        return Decimal('1.0') - self.taux_frais_total
    
    @classmethod
    def get_parametres(cls, banque):
        """
        Récupère les paramètres Épargne Plus pour une banque
        
        Args:
            banque: Instance Banque
            
        Returns:
            Instance TableEpargnePlus
        """
        try:
            return cls.objects.get(banque=banque, actif=True)
        except cls.DoesNotExist:
            raise ValueError(
                f"Aucun paramètre Épargne Plus actif trouvé pour {banque.nom}"
            )
        except cls.MultipleObjectsReturned:
            # Prendre le plus récent
            return cls.objects.filter(banque=banque, actif=True).latest('date_creation')




class TableParametresEpargnePlus(models.Model):
    """
    Paramètres de tarification pour ÉPARGNE PLUS par banque
    Produit d'épargne avec capitalisation d'intérêts
    
    Structure :
    - Taux d'intérêt annuel/mensuel
    - Frais sur primes (gestion, acquisition, tirage)
    - Durée minimum du contrat
    - Pénalités de rachat anticipé
    - Cotisation minimum
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    banque = models.ForeignKey(
        Banque,
        on_delete=models.PROTECT,
        related_name='parametres_epargne_plus',
        verbose_name="Banque"
    )
    
    # Paramètres financiers
    taux_interet_annuel = models.DecimalField(
        max_digits=6,
        decimal_places=6,
        default=Decimal('0.0304'),
        verbose_name="Taux d'intérêt annuel",
        help_text="Taux d'intérêt annuel (ex: 0.0304 = 3.04%)"
    )
    
    taux_interet_mensuel = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        verbose_name="Taux d'intérêt mensuel",
        help_text="Taux d'intérêt mensuel calculé automatiquement",
        blank=True,
        null=True
    )
    
    # Frais sur primes
    taux_frais_gestion = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0300'),
        verbose_name="Taux frais de gestion",
        help_text="Frais de gestion sur prime (ex: 0.03 = 3%)"
    )
    
    taux_frais_acquisition = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0300'),
        verbose_name="Taux frais d'acquisition",
        help_text="Frais d'acquisition sur prime (ex: 0.03 = 3%)"
    )
    
    taux_frais_tirage = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0100'),
        verbose_name="Taux frais de tirage",
        help_text="Frais de tirage sur prime (ex: 0.01 = 1%)"
    )
    
    taux_frais_total = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        verbose_name="Taux frais total",
        help_text="Somme des frais (calculé automatiquement)",
        blank=True,
        null=True
    )
    
    # Montants minimums
    frais_adhesion_minimum = models.IntegerField(
        default=5000,
        verbose_name="Frais d'adhésion minimum",
        help_text="Frais d'adhésion en FCFA"
    )
    
    cotisation_minimum = models.IntegerField(
        default=5000,
        verbose_name="Cotisation minimum",
        help_text="Cotisation mensuelle minimum en FCFA"
    )
    
    # Durées
    duree_minimum_annees = models.IntegerField(
        default=5,
        verbose_name="Durée minimum en années",
        help_text="Durée minimum du contrat en années"
    )
    
    duree_penalite_rachat_annees = models.IntegerField(
        default=10,
        verbose_name="Durée pénalité rachat",
        help_text="Durée maximale de pénalité de rachat en années"
    )
    
    taux_penalite_rachat = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0500'),
        verbose_name="Taux pénalité rachat",
        help_text="Pénalité de rachat anticipé (ex: 0.05 = 5%)"
    )
    
    # Périodicité
    periodicite = models.CharField(
        max_length=20,
        default='Mensuel',
        verbose_name="Périodicité",
        help_text="Périodicité des cotisations (Mensuel, Trimestriel, etc.)"
    )
    
    periodicite_tirage = models.CharField(
        max_length=20,
        default='Trimestriel',
        verbose_name="Périodicité tirages",
        help_text="Périodicité des tirages"
    )
    
    # Statut
    actif = models.BooleanField(
        default=True,
        verbose_name="Paramètres actifs"
    )

    # NOUVEAU : Délai minimum pour rachat
    delai_minimum_rachat_mois = models.IntegerField(
        default=12,
        verbose_name="Délai minimum rachat (mois)",
        help_text="Nombre de mois minimum avant rachat (BGFI : 12 mois)"
    )
    
    # NOUVEAU : Rachat partiel max selon durée
    rachat_partiel_max_12_23_mois = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        verbose_name="Rachat partiel max 12-23 mois (%)",
        help_text="BGFI : 50% entre 12 et 23 mois"
    )
    
    rachat_partiel_max_24_plus_mois = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('85.00'),
        verbose_name="Rachat partiel max 24+ mois (%)",
        help_text="BGFI : 85% à partir de 24 mois"
    )
    
    # NOUVEAU : Séparer explicitement le 1% tirage
    taux_quote_part_tirage = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0100'),
        verbose_name="Quote-part tirage au sort",
        help_text="BGFI : 1% pour fonds cagnotte"
    )
    
    # NOUVEAU : Minimum cotisation exceptionnelle
    cotisation_exceptionnelle_minimum_multiplicateur = models.IntegerField(
        default=2,
        verbose_name="Multiplicateur cotisation exceptionnelle",
        help_text="BGFI : Minimum = 2× cotisation mensuelle"
    )
    
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tarification_parametres_epargne_plus'
        verbose_name = "Paramètres Épargne Plus"
        verbose_name_plural = "Paramètres Épargne Plus"
        ordering = ['banque__nom_court']
        unique_together = [['banque']]
        indexes = [
            models.Index(fields=['banque']),
            models.Index(fields=['actif']),
        ]
    
    def __str__(self):
        return f"Épargne Plus - {self.banque.code_banque} - Taux {self.taux_interet_annuel}%"
    
    def save(self, *args, **kwargs):
        """Calcule automatiquement les taux dérivés avant la sauvegarde"""
        # Calculer le taux mensuel à partir du taux annuel
        # Formule : (1 + taux_annuel)^(1/12) - 1
        if self.taux_interet_annuel:
            taux_annuel_decimal = float(self.taux_interet_annuel)
            self.taux_interet_mensuel = Decimal(str((1 + taux_annuel_decimal) ** (1/12) - 1))
        
        # Calculer le taux de frais total
        self.taux_frais_total = (
            self.taux_frais_gestion +
            self.taux_frais_acquisition +
            self.taux_frais_tirage
        )
        
        super().save(*args, **kwargs)
    
    @classmethod
    def get_parametres(cls, banque):
        """
        Récupère les paramètres Épargne Plus pour une banque
        
        Args:
            banque: Instance Banque
            
        Returns:
            Instance TableParametresEpargnePlus
            
        Raises:
            ValueError si aucun paramètre trouvé
        """
        try:
            return cls.objects.get(banque=banque, actif=True)
        except cls.DoesNotExist:
            raise ValueError(
                f"Aucun paramètre Épargne Plus trouvé pour la banque {banque.code}"
            )
    
    def get_taux_net_cotisation(self):
        """Retourne le taux net après déduction des frais (93% = 1 - 7%)"""
        return Decimal('1') - self.taux_frais_total
    
    def calculer_penalite_rachat(self, capital: Decimal, duree_annees: int) -> Decimal:
        """
        Calcule la pénalité de rachat anticipé
        
        Args:
            capital: Capital à la date de rachat
            duree_annees: Durée écoulée en années
            
        Returns:
            Montant de la pénalité
        """
        if duree_annees >= self.duree_penalite_rachat_annees:
            return Decimal('0')
        
        return capital * self.taux_penalite_rachat


# ============================================
# METTRE À JOUR Simulation.PRODUIT_CHOICES
# ============================================
# 
# PRODUIT_CHOICES = [
#     ('emprunteur', 'Assurance Emprunteur'),
#     ('emprunteur_boa', 'Assurance Emprunteur BOA'),
#     ('retraite', 'Confort Retraite'),
#     ('etudes', 'Confort Études'),
#     ('elikia', 'Elikia Scolaire'),
#     ('mobateli', 'Mobateli (DTC/IAD)'),
#     ('likama', 'Likama BOA (DTC/IAD)'),
#     ('elikia_boa', 'Elikia Scolaire BOA'),
#     ('epargne_plus', 'Épargne Plus'),  # ← AJOUTER
# ]