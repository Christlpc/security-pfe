"""
Serializers pour le simulateur NSIA
Phase 3 : API Simulateur
"""
from decimal import Decimal
from django.forms import ValidationError
from rest_framework import serializers

from apps.simulateur.services.calculateur_surprime import calculer_et_appliquer_surprime
from .models import Beneficiaire, DetailQ2, QuestionnaireMedical, Simulation, Souscription
from apps.core.models import Banque
from datetime import date


class DetailQ2Serializer(serializers.ModelSerializer):
    """
    Serializer pour les détails médicaux Q2
    Accepte un objet unique ou une liste (many=True)
    """

    question_label = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Libellé de la question (auto-rempli si omis)"
    )

    class Meta:
        model = DetailQ2
        fields = [
            'id',
            'questionnaire',
            'question_field',
            'question_label',
            'precisez',
            'periode_traitement',
            'lieu_traitement',
            'date_creation',
            'date_modification',
        ]
        read_only_fields = ['id', 'date_creation', 'date_modification']

    def validate_question_field(self, value):
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

        if value not in questions_valides:
            raise ValidationError(
                f"Question invalide. Doit être parmi : {', '.join(questions_valides)}"
            )

        return value

    def validate(self, data):
        questionnaire = data.get('questionnaire')
        question_field = data.get('question_field')

        # Vérifier que la question est bien à OUI
        if questionnaire and question_field and hasattr(questionnaire, question_field):
            if not getattr(questionnaire, question_field):
                raise ValidationError({
                    'question_field': (
                        f"La question '{question_field}' a une réponse NON. "
                        f"Les détails sont autorisés uniquement pour les réponses OUI."
                    )
                })

        # Auto-remplir le label si absent
        if not data.get('question_label'):
            data['question_label'] = self._get_question_label(question_field)

        return data

    def _get_question_label(self, question_field):
        labels = {
            'a_infirmite': "Êtes-vous atteint d'une infirmité ?",
            'malade_6_derniers_mois': "Avez-vous été malade au cours des 6 derniers mois ?",
            'souvent_fatigue': "Êtes-vous souvent fatigué(e) ?",
            'perte_poids_recente': "Avez-vous maigri depuis les 6 derniers mois ?",
            'prise_poids_recente': "Avez-vous grossi depuis les 6 derniers mois ?",
            'a_ganglions': "Avez-vous des ganglions ou maladies de la peau ?",
            'fievre_persistante': "Avez-vous une fièvre persistante ?",
            'plaies_buccales': "Avez-vous des plaies buccales ?",
            'diarrhee_frequente': "Faites-vous souvent la diarrhée ?",
            'ballonnement': "Êtes-vous souvent ballonné(e) ?",
            'oedemes_membres_inferieurs': "Avez-vous des œdèmes des membres inférieurs ?",
            'essoufflement': "Êtes-vous essoufflé(e) au moindre effort ?",
            'a_eu_perfusion': "Avez-vous déjà reçu une perfusion ?",
            'a_eu_transfusion': "Avez-vous déjà reçu une transfusion sanguine ?",
        }
        return labels.get(question_field, question_field)


class BeneficiaireInputSerializer(serializers.Serializer):
    qualite = serializers.CharField(max_length=50)
    nom_prenoms = serializers.CharField(max_length=255)
    part_pourcentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2
    )
    ordre = serializers.IntegerField()

class BeneficiaireSerializer(serializers.ModelSerializer):
    """
    Serializer pour les bénéficiaires en cas de décès
    
    Validation importante : La somme des parts doit être 100%
    """
    
    qualite_display = serializers.CharField(
        source='get_qualite_display',
        read_only=True,
        help_text="Libellé lisible de la qualité"
    )
    
    class Meta:
        model = Beneficiaire
        fields = [
            'id',
            #'simulation',
            'qualite',
            'qualite_display',
            'nom_prenoms',
            'part_pourcentage',
            'ordre',
            'date_creation',
            'date_modification',
        ]
        read_only_fields = ['id', 'date_creation', 'date_modification']
    
    def validate_part_pourcentage(self, value):
        """
        Valider que la part est entre 0.01 et 100
        """
        if value <= Decimal('0'):
            raise ValidationError("La part doit être supérieure à 0%")
        
        if value > Decimal('100'):
            raise ValidationError("La part ne peut pas dépasser 100%")
        
        return value
    
    def validate(self, data):
        """
        Validation globale : vérifier que la somme des parts ne dépasse pas 100%
        """
        simulation = data.get('simulation')
        part = data.get('part_pourcentage')
        
        if simulation and part:
            # Récupérer l'instance actuelle si c'est une mise à jour
            instance_id = self.instance.id if self.instance else None
            
            # Calculer la somme des autres bénéficiaires
            autres_beneficiaires = Beneficiaire.objects.filter(
                simulation=simulation
            )
            
            # Exclure l'instance actuelle si c'est une mise à jour
            if instance_id:
                autres_beneficiaires = autres_beneficiaires.exclude(id=instance_id)
            
            total_autres = sum(
                b.part_pourcentage for b in autres_beneficiaires
            )
            
            total_avec_celui_ci = total_autres + part
            
            if total_avec_celui_ci > Decimal('100.00'):
                raise ValidationError({
                    'part_pourcentage': f"La somme des parts dépasse 100% ({total_avec_celui_ci}%). "
                                       f"Total des autres bénéficiaires : {total_autres}%"
                })
        
        return data


from dateutil.relativedelta import relativedelta

# =============================================
# SERIALIZER ELIKIA — corrigé
# =============================================

from datetime import date
from dateutil.relativedelta import relativedelta
from rest_framework import serializers


# =============================================
# HELPER — Calcul trimestre
# =============================================

def get_date_effet_etudes(d: date) -> date:
    """Date effet = 1er jour du mois suivant la date passée en paramètre.
    Utilisé pour Mobateli (sur la date de paiement de la prime).
    Règle NSIA : la date d'effet Mobateli = 1er du mois suivant le mois de paiement de la prime.
    """
    cible = d + relativedelta(months=1)
    return cible.replace(day=1)

# =============================================
# SERIALIZER ELIKIA — Simulateur
# =============================================

class SimulateurElikiaInputSerializer(serializers.Serializer):
    """
    Serializer Elikia Scolaire — fidèle au Bulletin d'Adhésion NSIA (BIA).

    Sections du BIA reproduites :
      RÉSERVÉ NSIA → numéro client, conseiller, convention
      1. PARTIES CONTRACTANTES (souscripteur)
      2. ASSURÉ (ou IDEM si = souscripteur)
      3. ÉLÈVE / ÉTUDIANT BÉNÉFICIAIRE
      II. CAPITAUX SOUSCRITS (rente annuelle + options)
      III. PRIMES (calculées)
      PAIEMENT (mode, durée, cotisation, origine des fonds)
    """

    # ===========================================================
    # RÉSERVÉ NSIA
    # ===========================================================
    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nom_conseiller     = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_convention  = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # ===========================================================
    # 1. PARTIES CONTRACTANTES (Souscripteur)
    # ===========================================================
    assure_est_souscripteur = serializers.BooleanField(default=True,
        help_text="True = le souscripteur est l'assuré (IDEM sur le BIA)")
    souscripteur = serializers.DictField(required=False, allow_null=True,
        help_text="Si assure_est_souscripteur=false : {civilite, nom, prenoms, date_naissance, lieu_naissance, ...}")

    # ===========================================================
    # 2. ASSURÉ (identité + contacts)
    # ===========================================================
    titre_assure           = serializers.ChoiceField(choices=['M', 'MME', 'MLLE'], required=False)
    nom                    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom                 = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance         = serializers.DateField(help_text="Date de naissance de l'assuré")
    lieu_naissance         = serializers.CharField(max_length=100, required=False, allow_blank=True)
    situation_matrimoniale = serializers.ChoiceField(
        choices=['celibataire', 'marie', 'divorce', 'veuf', 'concubin'],
        required=False, allow_blank=True)

    adresse_geographique   = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale        = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cellulaire             = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_domicile     = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau       = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email                  = serializers.EmailField(required=False, allow_blank=True)
    email_professionnel    = serializers.EmailField(required=False, allow_blank=True)

    profession             = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur              = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur      = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur    = serializers.CharField(max_length=20, required=False, allow_blank=True)
    poste_occupe           = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_compte          = serializers.CharField(max_length=50, required=False, allow_blank=True)

    correspondant_nom       = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # ===========================================================
    # 3. ÉLÈVE / ÉTUDIANT BÉNÉFICIAIRE
    # ===========================================================
    eleves = serializers.ListField(
        child=serializers.DictField(),
        required=False, allow_empty=True,
        help_text="[{nom_prenoms, date_naissance, qualite}, ...]"
    )

    # ===========================================================
    # II. CAPITAUX SOUSCRITS
    # ===========================================================
    rente_annuelle = serializers.ChoiceField(
        choices=[200000, 400000, 600000, 800000, 1000000],
        help_text="Montant de la rente annuelle souhaitée (FCFA)"
    )
    duree_rente = serializers.IntegerField(
        min_value=1, max_value=10,
        help_text="Durée de service de la rente (années)"
    )
    duree_contrat = serializers.IntegerField(
        min_value=1, max_value=30,
        help_text="Durée du contrat en années"
    )

    # ===========================================================
    # PAIEMENT
    # ===========================================================
    mode_paiement = serializers.ChoiceField(
        choices=['prelevement_bancaire', 'especes', 'precompte_salaire', 'cheque', 'mobile_money'],
        required=False, allow_blank=True)
    operateur_mobile_money = serializers.CharField(max_length=50, required=False, allow_blank=True)
    type_cotisation = serializers.ChoiceField(
        choices=['prime_unique', 'cotisations_annuelles'],
        required=False, allow_blank=True)
    date_premiere_prime = serializers.DateField(required=False, allow_null=True)
    origine_des_fonds   = serializers.CharField(max_length=200, required=False, allow_blank=True)

    # ===========================================================
    # BÉNÉFICIAIRES en cas de décès
    # ===========================================================
    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # ===========================================================
    # CONTRÔLE
    # ===========================================================
    sauvegarder = serializers.BooleanField(default=True)

    # ========================================
    # CHAMPS CALCULÉS (read_only)
    # ========================================
    age_parent             = serializers.IntegerField(read_only=True)
    date_signature         = serializers.DateField(read_only=True)
    date_effet             = serializers.DateField(read_only=True)
    date_echeance          = serializers.DateField(read_only=True)
    date_fin               = serializers.DateField(read_only=True)

    # ========================================
    # VALIDATION
    # ========================================
    def validate(self, attrs):
        # --- Dates calculées automatiquement ---
        # Règle NSIA validée :
        #   date_effet = 1er jour du mois suivant la signature
        #   (NSIA appelle ça « immédiate », par opposition à un alignement
        #    manuel sur la rentrée scolaire — c'est la valeur calculée
        #    automatiquement par le système.)
        attrs['date_signature'] = date.today()
        attrs['date_effet']     = get_date_effet_etudes(attrs['date_signature'])

        date_effet     = attrs['date_effet']
        date_naissance = attrs['date_naissance']
        duree_contrat  = attrs['duree_contrat']

        # --- Validation date naissance ---
        if date_naissance >= date_effet:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date d'effet.")

        # --- Calcul âge réel ---
        age = (
            date_effet.year - date_naissance.year
            - ((date_effet.month, date_effet.day) < (date_naissance.month, date_naissance.day))
        )
        if age < 18 or age > 65:
            raise serializers.ValidationError(
                f"Âge invalide ({age} ans). L'âge doit être compris entre 18 et 65 ans.")
        attrs['age_parent'] = age

        # --- Vérification : âge max 65 ans à la fin du contrat ---
        date_limite_age = date_naissance + relativedelta(years=65)
        fin_contrat     = attrs['date_effet'] + relativedelta(years=duree_contrat)
        if fin_contrat > date_limite_age:
            raise serializers.ValidationError(
                "La durée du contrat dépasse l'âge limite de 65 ans.")

        # --- date_premiere_prime : défaut = date_effet (= 1ère cotisation alignée) ---
        if not attrs.get('date_premiere_prime'):
            attrs['date_premiere_prime'] = date_effet

        # --- Dates contractuelles selon règles NSIA ---
        # date_echeance = échéance annuelle (renouvellement chaque année)
        # date_fin      = fin réelle du contrat (= date_effet + durée d'engagement)
        attrs['date_echeance'] = date_effet + relativedelta(years=1)
        attrs['date_fin']      = fin_contrat

        # --- Compatibilité calculateur (duree_engagement) ---
        attrs['duree_engagement'] = duree_contrat

        return attrs

# =============================================
# SERIALIZER MOBATELI — corrigé
# =============================================

class SimulateurMobateliInputSerializer(serializers.Serializer):
    """
    Serializer Mobateli — fidèle au Bulletin d'Adhésion NSIA (BIA).

    Sections du BIA reproduites :
      RÉSERVÉ NSIA → en-tête auto-généré
      1. PARTIES CONTRACTANTES (souscripteur)
      2. ASSURÉ (l'assuré, ou IDEM si = souscripteur)
      3. FICHE D'IDENTIFICATION FAMILIALE (conjoint + enfants)
      4. BÉNÉFICIAIRES
      II. CAPITAUX SOUSCRITS ET PRIMES (garanties)
      PAIEMENT (mode, durée, origine des fonds)
    """

    # ===========================================================
    # RÉSERVÉ NSIA VIE CONGO
    # ===========================================================

    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True,
        help_text="Numéro du client NSIA")
    nom_conseiller = serializers.CharField(max_length=100, required=False, allow_blank=True,
        help_text="Nom du conseiller")
    numero_convention = serializers.CharField(max_length=50, required=False, allow_blank=True,
        help_text="Numéro de convention banque-NSIA")

    # ===========================================================
    # 1. PARTIES CONTRACTANTES (Souscripteur)
    # ===========================================================

    assure_est_souscripteur = serializers.BooleanField(
        default=True,
        help_text="True = l'assuré est le souscripteur (IDEM). False = souscripteur différent."
    )

    # Données du souscripteur (uniquement si assure_est_souscripteur = false)
    souscripteur = serializers.DictField(
        required=False, allow_null=True,
        help_text=(
            "Infos du souscripteur si ≠ assuré. Structure : "
            "{civilite, nom, prenoms, date_naissance, lieu_naissance, "
            "situation_matrimoniale, adresse_geographique, adresse_postale, "
            "telephone_domicile, cellulaire, profession, employeur, "
            "adresse_employeur, telephone_employeur, poste, telephone_bureau, "
            "email_personnel, email_professionnel, correspondant, "
            "tel_correspondant, cellulaire_correspondant}"
        )
    )

    # ===========================================================
    # 2. ASSURÉ
    # ===========================================================

    # Identité
    titre_assure = serializers.ChoiceField(
        choices=[('M', 'Monsieur'), ('MME', 'Madame'), ('MLLE', 'Mademoiselle')],
        required=False, allow_blank=True
    )
    nom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance = serializers.DateField(help_text="Date de naissance (YYYY-MM-DD)")
    lieu_naissance = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nationalite = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_piece_identite = serializers.CharField(max_length=50, required=False, allow_blank=True)
    type_piece_identite = serializers.ChoiceField(
        choices=[('cni', 'CNI'), ('passeport', 'Passeport'),
                 ('carte_consulaire', 'Carte Consulaire'),
                 ('titre_sejour', 'Titre de Séjour'), ('autre', 'Autre')],
        required=False, allow_blank=True
    )

    # Situation
    situation_matrimoniale = serializers.ChoiceField(
        choices=[('celibataire', 'Célibataire'), ('marie', 'Marié(e)'),
                 ('divorce', 'Divorcé(e)'), ('veuf', 'Veuf(ve)'),
                 ('concubin', 'Concubin(e)')],
        required=False, allow_blank=True
    )

    # Adresses
    adresse_geographique = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Téléphones (3 types selon BIA)
    telephone_domicile = serializers.CharField(max_length=20, required=False, allow_blank=True)
    cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Emails (2 types selon BIA)
    email = serializers.EmailField(required=False, allow_blank=True,
        help_text="E-mail personnel")
    email_professionnel = serializers.EmailField(required=False, allow_blank=True)

    # Emploi
    profession = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur = serializers.CharField(max_length=20, required=False, allow_blank=True)
    poste_occupe = serializers.CharField(max_length=100, required=False, allow_blank=True,
        help_text="Poste / fonction occupée")

    # Compte bancaire
    numero_compte = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # Correspondant
    correspondant_nom = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # ===========================================================
    # 3. FICHE D'IDENTIFICATION FAMILIALE
    #    (Ne remplir que si FF s'étend à la famille)
    # ===========================================================

    conjoint = serializers.DictField(
        required=False, allow_null=True,
        help_text=(
            "Conjoint(e) : {civilite, nom, prenoms, date_naissance, "
            "lieu_naissance, telephone_domicile, telephone_bureau, mobile}"
        )
    )

    enfants = serializers.ListField(
        child=serializers.DictField(),
        required=False, allow_empty=True,
        help_text="Enfants (max 6) : [{nom_prenoms, date_naissance}, ...]"
    )

    # ===========================================================
    # 4. BÉNÉFICIAIRES
    # ===========================================================

    beneficiaires_predefinis = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('conjoint', 'Mon conjoint non divorcé, ni séparé de corps'),
            ('enfants', 'Mes enfants nés ou à naître'),
            ('autres', 'Autres, précisez'),
        ]),
        required=False, allow_empty=True,
        help_text="Cases pré-cochées du BIA (conjoint, enfants, autres)"
    )

    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # ===========================================================
    # II. CAPITAUX SOUSCRITS ET PRIMES
    # ===========================================================

    # Capital DTC/IAD (input principal pour le calcul)
    capital_dtc_iad = serializers.IntegerField(
        help_text="Capital Décès Toutes Causes / IAD en FCFA"
    )

    # Garanties complémentaires (cases à cocher du BIA)
    garanties = serializers.DictField(
        required=False, allow_null=True,
        help_text=(
            "Garanties souscrites : {"
            "deces_accidentel: {souscrite: bool, capital: int}, "
            "ipt: {souscrite: bool, capital: int}, "
            "ipp: {souscrite: bool, capital: int}, "
            "frais_funeraires: {souscrite: bool, option: 'option_1'|'option_2'|'option_3'}"
            "}"
        )
    )

    # ===========================================================
    # PAIEMENT
    # ===========================================================

    mode_paiement = serializers.ChoiceField(
        choices=[
            ('prelevement_bancaire', 'Prélèvement Bancaire'),
            ('prelevement_salaire', 'Prélèvement sur salaire'),
            ('especes', 'Espèces'),
            ('cheque', 'Chèque'),
        ],
        required=False, allow_blank=True
    )

    type_cotisation = serializers.ChoiceField(
        choices=[
            ('prime_unique', 'Prime unique'),
            ('cotisations_annuelles', 'Cotisations annuelles'),
        ],
        required=False, allow_blank=True
    )

    duree_contrat = serializers.IntegerField(
        min_value=1, max_value=30, required=False,
        help_text="Durée du contrat en années"
    )

    date_premiere_prime = serializers.DateField(
        required=False, allow_null=True,
        help_text="Date à laquelle vous voulez payer la première prime"
    )

    origine_des_fonds = serializers.CharField(
        required=False, allow_blank=True,
        help_text="Précisez l'origine des fonds servant à souscrire"
    )

    # ===========================================================
    # CONTRÔLE
    # ===========================================================

    sauvegarder = serializers.BooleanField(default=True)

    # Champs calculés (read_only)
    age = serializers.IntegerField(read_only=True)
    date_effet = serializers.DateField(read_only=True)
    date_echeance = serializers.DateField(read_only=True)

    # ===========================================================
    # VALIDATION
    # ===========================================================

    def validate(self, attrs):
        date_naissance = attrs['date_naissance']
        today = date.today()

        if date_naissance >= today:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à aujourd'hui."
            )

        # Calcul de l'âge
        age = (
            today.year - date_naissance.year
            - ((today.month, today.day) < (date_naissance.month, date_naissance.day))
        )

        if age < 18 or age > 65:
            raise serializers.ValidationError(
                f"Âge invalide ({age} ans). L'âge doit être compris entre 18 et 65 ans."
            )
        attrs['age'] = age

        # Dates calculées
        date_premiere_prime = attrs.get('date_premiere_prime') or today
        attrs['date_premiere_prime'] = date_premiere_prime
        attrs['date_effet'] = get_date_effet_etudes(date_premiere_prime)

        duree = attrs.get('duree_contrat')
        if duree:
            attrs['date_echeance'] = attrs['date_effet'] + relativedelta(years=duree)

            # Vérifier âge max 65 ans à la fin
            date_limite = date_naissance + relativedelta(years=65)
            if attrs['date_echeance'] > date_limite:
                raise serializers.ValidationError(
                    "La durée du contrat dépasse l'âge limite de 65 ans."
                )
        else:
            attrs['date_echeance'] = None

        # Souscripteur : obligatoire si assure_est_souscripteur = False
        if not attrs.get('assure_est_souscripteur', True):
            souscripteur = attrs.get('souscripteur')
            if not souscripteur or not isinstance(souscripteur, dict):
                raise serializers.ValidationError(
                    "Les données du souscripteur sont obligatoires quand il diffère de l'assuré."
                )
            for champ in ('nom', 'prenoms'):
                if not souscripteur.get(champ, '').strip():
                    raise serializers.ValidationError(
                        f"Le champ '{champ}' du souscripteur est obligatoire."
                    )

        # Validation garanties
        self._valider_garanties(attrs)

        return attrs

    def _valider_garanties(self, attrs):
        """Valide la structure des garanties selon le BIA."""
        garanties = attrs.get('garanties')
        if not garanties:
            return

        options_ff_valides = ('option_1', 'option_2', 'option_3')

        if 'frais_funeraires' in garanties:
            ff = garanties['frais_funeraires']
            if isinstance(ff, dict) and ff.get('souscrite'):
                option = ff.get('option', '')
                if option not in options_ff_valides:
                    raise serializers.ValidationError(
                        f"Option Frais Funéraires invalide. "
                        f"Choix : {', '.join(options_ff_valides)}"
                    )

    def validate_conjoint(self, value):
        """Valide les données du conjoint."""
        if not value:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Le conjoint doit être un dictionnaire.")
        # nom et prenoms recommandés si FF famille
        return value

    def validate_enfants(self, value):
        """Valide la liste des enfants (max 6 selon BIA)."""
        if not value:
            return value
        if len(value) > 6:
            raise serializers.ValidationError(
                "Le BIA accepte un maximum de 6 enfants."
            )
        for idx, enfant in enumerate(value):
            if not isinstance(enfant, dict):
                raise serializers.ValidationError(
                    f"L'enfant {idx + 1} doit être un dictionnaire."
                )
            if not enfant.get('nom_prenoms', '').strip():
                raise serializers.ValidationError(
                    f"Le nom de l'enfant {idx + 1} est obligatoire."
                )
        return value


# =============================================
# MOBATELI SUR MESURE
# =============================================

class SimulateurMobateliSurMesureInputSerializer(serializers.Serializer):
    """
    Serializer d'entrée pour Mobateli Sur Mesure.
    Reproduction fidèle du simulateur Excel (Simulateur MOBATELI.xlsm).

    Volet DTC  : Input = prime souhaitée  → Output = capital couvert
    Volet DTC+FF : Input = capital (palier) → Output = prime forfaitaire

    Accepte aussi tous les champs BIA (souscripteur, famille, bénéficiaires,
    paiement, etc.) pour la sauvegarde complète de la simulation.
    """

    # ============================================
    # CHOIX DU VOLET
    # ============================================

    volet = serializers.ChoiceField(
        choices=[('dtc', 'DTC'), ('dtc_ff', 'DTC + Frais Funéraires')],
        help_text="Volet : 'dtc' (prime → capital) ou 'dtc_ff' (capital → prime + FF)"
    )

    # ============================================
    # CHAMPS COMMUNS
    # ============================================

    date_naissance = serializers.DateField(
        help_text="Date de naissance de l'assuré (format YYYY-MM-DD)"
    )

    date_souscription = serializers.DateField(
        required=False,
        help_text="Date de souscription (défaut : aujourd'hui)"
    )

    # ============================================
    # CHAMPS VOLET DTC (prime → capital)
    # ============================================

    prime = serializers.DecimalField(
        max_digits=15, decimal_places=2,
        required=False,
        min_value=1,
        help_text="[Volet DTC] Prime souhaitée en FCFA"
    )

    duree = serializers.IntegerField(
        required=False,
        default=1,
        min_value=1, max_value=5,
        help_text="[Volet DTC] Durée de couverture en années (1 à 5, défaut : 1)"
    )

    type_prime = serializers.ChoiceField(
        choices=[('annuelle', 'Prime Annuelle'), ('unique', 'Prime Unique')],
        required=False,
        default='annuelle',
        help_text="[Volet DTC] Type de prime : 'annuelle' (défaut) ou 'unique'"
    )

    # ============================================
    # CHAMPS VOLET DTC+FF (capital → prime)
    # ============================================

    capital = serializers.DecimalField(
        max_digits=15, decimal_places=2,
        required=False,
        min_value=1,
        help_text="[Volet DTC+FF] Capital DTC en FCFA (paliers : 2M, 5M, 7.5M)"
    )

    # ============================================
    # INFORMATIONS CLIENT (même structure que forfaitaire)
    # ============================================

    # Réservé NSIA
    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nom_conseiller = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_convention = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # Souscripteur
    assure_est_souscripteur = serializers.BooleanField(default=True)
    souscripteur = serializers.DictField(required=False, allow_null=True)

    # Identité assuré
    titre_assure = serializers.ChoiceField(
        choices=[('M', 'Monsieur'), ('MME', 'Madame'), ('MLLE', 'Mademoiselle')],
        required=False, allow_blank=True
    )
    nom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    lieu_naissance = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nationalite = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_piece_identite = serializers.CharField(max_length=50, required=False, allow_blank=True)
    type_piece_identite = serializers.ChoiceField(
        choices=[('cni', 'CNI'), ('passeport', 'Passeport'),
                 ('carte_consulaire', 'Carte Consulaire'),
                 ('titre_sejour', 'Titre de Séjour'), ('autre', 'Autre')],
        required=False, allow_blank=True
    )
    situation_matrimoniale = serializers.ChoiceField(
        choices=[('celibataire', 'Célibataire'), ('marie', 'Marié(e)'),
                 ('divorce', 'Divorcé(e)'), ('veuf', 'Veuf(ve)'),
                 ('concubin', 'Concubin(e)')],
        required=False, allow_blank=True
    )

    # Contacts assuré
    adresse_geographique = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_domicile = serializers.CharField(max_length=20, required=False, allow_blank=True)
    cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    email_professionnel = serializers.EmailField(required=False, allow_blank=True)
    telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Emploi assuré
    profession = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur = serializers.CharField(max_length=20, required=False, allow_blank=True)
    poste_occupe = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_compte = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # Correspondant
    correspondant_nom = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Famille
    conjoint = serializers.DictField(required=False, allow_null=True)
    enfants = serializers.ListField(
        child=serializers.DictField(), required=False, allow_empty=True
    )

    # Bénéficiaires
    beneficiaires_predefinis = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('conjoint', 'Conjoint'), ('enfants', 'Enfants'), ('autres', 'Autres'),
        ]),
        required=False, allow_empty=True
    )
    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # Capitaux & Garanties
    capital_dtc_iad = serializers.IntegerField(required=False, allow_null=True)
    garanties = serializers.DictField(required=False, allow_null=True)

    # Paiement
    mode_paiement = serializers.ChoiceField(
        choices=[
            ('prelevement_bancaire', 'Prélèvement Bancaire'),
            ('prelevement_salaire', 'Prélèvement sur salaire'),
            ('especes', 'Espèces'), ('cheque', 'Chèque'),
        ],
        required=False, allow_blank=True
    )
    type_cotisation = serializers.ChoiceField(
        choices=[
            ('prime_unique', 'Prime unique'),
            ('cotisations_annuelles', 'Cotisations annuelles'),
        ],
        required=False, allow_blank=True
    )
    duree_contrat = serializers.IntegerField(min_value=1, max_value=30, required=False)
    date_premiere_prime = serializers.DateField(required=False, allow_null=True)
    date_effet = serializers.DateField(required=False, allow_null=True)
    date_echeance = serializers.DateField(required=False, allow_null=True)
    origine_des_fonds = serializers.CharField(required=False, allow_blank=True)

    sauvegarder = serializers.BooleanField(default=True)

    # Champ calculé
    age = serializers.IntegerField(read_only=True)

    def validate(self, attrs):
        volet = attrs['volet']
        date_naissance = attrs['date_naissance']

        # Date de souscription (défaut : aujourd'hui)
        date_souscription = attrs.get('date_souscription') or date.today()
        attrs['date_souscription'] = date_souscription

        if date_naissance >= date_souscription:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date de souscription."
            )

        # Âge RÉEL (au dernier anniversaire) à la date de souscription.
        # Correction : l'ancienne formule (soustraction d'années seule, héritée du
        # DateDiff("yyyy") VBA) renvoyait un âge ne correspondant pas à la date de
        # naissance et faussait la tarification près des frontières de tranches.
        age = (
            date_souscription.year - date_naissance.year
            - ((date_souscription.month, date_souscription.day)
               < (date_naissance.month, date_naissance.day))
        )

        attrs['age'] = age

        # --- Validation spécifique par volet ---
        if volet == 'dtc':
            if 'prime' not in attrs or attrs.get('prime') is None:
                raise serializers.ValidationError(
                    "Le champ 'prime' est obligatoire pour le volet DTC."
                )
            if age < 20 or age > 70:
                raise serializers.ValidationError(
                    f"Âge invalide ({age} ans). L'âge doit être entre 20 et 70 ans pour le volet DTC."
                )
            duree = attrs.get('duree', 1)
            attrs['duree'] = duree

        elif volet == 'dtc_ff':
            if 'capital' not in attrs or attrs.get('capital') is None:
                raise serializers.ValidationError(
                    "Le champ 'capital' est obligatoire pour le volet DTC+FF."
                )
            if age > 64:
                raise serializers.ValidationError(
                    f"Âge invalide ({age} ans). L'âge maximum est 64 ans pour le volet DTC+FF."
                )

        return attrs


# =============================================
# EMPRUNTEUR — corrigé
# =============================================

class ContactSerializer(serializers.Serializer):
    nom       = serializers.CharField(max_length=100, required=False, allow_blank=True)
    telephone = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)



class SimulateurEmprunteurInputSerializer(serializers.Serializer):
    """
    Serializer Emprunteur ADI — fidèle au Bulletin d'Adhésion NSIA (BIA).

    Sections du BIA reproduites :
      RÉSERVÉ NSIA → numéro client, conseiller, convention
      1. PARTIE CONTRACTANTE / SOUSCRIPTEUR
      2. ASSURÉ (ou IDEM si = souscripteur) + qualité
      3. ORGANISME PRÊTEUR (auto-rempli depuis banque)
      4. BÉNÉFICIAIRES
      II. GARANTIES (prêt, durées, taux, périodicité, dates)
    """

    # ===========================================================
    # RÉSERVÉ NSIA
    # ===========================================================
    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nom_conseiller     = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_convention  = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # ===========================================================
    # 1. SOUSCRIPTEUR (= la banque en emprunteur groupe)
    # ===========================================================
    # Pas de champ souscripteur en input : c'est toujours la banque.
    # Le template lit directement simulation.banque.

    # ===========================================================
    # 2. ASSURÉ (le client emprunteur)
    # ===========================================================
    titre_assure           = serializers.ChoiceField(choices=['M', 'MME', 'MLLE'], required=False)
    nom                    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom                 = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance         = serializers.DateField(help_text="Date de naissance de l'assuré")
    lieu_naissance         = serializers.CharField(max_length=100, required=False, allow_blank=True)
    situation_matrimoniale = serializers.ChoiceField(
        choices=['celibataire', 'marie', 'divorce', 'veuf', 'concubin'],
        required=False, allow_blank=True)

    qualite_assure = serializers.ChoiceField(
        choices=['emprunteur', 'co_emprunteur', 'caution', 'autre'],
        required=False, default='emprunteur',
        help_text="Qualité de l'assuré : Emprunteur / Co-emprunteur / Caution / Autre")

    adresse_geographique   = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale        = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cellulaire             = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_domicile     = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau       = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email                  = serializers.EmailField(required=False, allow_blank=True)
    email_professionnel    = serializers.EmailField(required=False, allow_blank=True)

    profession             = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur              = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur      = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur    = serializers.CharField(max_length=20, required=False, allow_blank=True)
    poste_occupe           = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_compte          = serializers.CharField(max_length=50, required=False, allow_blank=True)

    correspondant_nom       = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)

    deja_souscrit_nsia     = serializers.BooleanField(required=False, default=False,
        help_text="Avez-vous déjà souscrit auprès de NSIA Vie Assurances ?")
    details_contrat_nsia   = serializers.CharField(max_length=200, required=False, allow_blank=True,
        help_text="Type de contrat et numéro de police (si deja_souscrit_nsia=true)")

    # ===========================================================
    # II. GARANTIES — paramètres financiers du prêt
    # ===========================================================
    montant_pret = serializers.DecimalField(
        max_digits=15, decimal_places=2, min_value=10000, max_value=49999999,
        help_text="Montant global du prêt en FCFA")
    duree_mois = serializers.IntegerField(
        min_value=1, max_value=360,
        help_text="Durée de remboursement du prêt en mois")
    duree_differe = serializers.IntegerField(
        min_value=0, max_value=120, required=False, default=0,
        help_text="Durée du différé en mois")
    taux_interet = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True,
        help_text="Taux d'intérêt du prêt en %")
    taux_tps = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True,
        help_text="Taux TPS en %")
    type_pret = serializers.CharField(
        max_length=100, required=False, allow_blank=True,
        help_text="Amortissement Standard, In Fine, etc.")
    type_assure = serializers.ChoiceField(
        choices=[('client', 'Client'), ('personnel', 'Personnel')],
        required=False, default='client',
        help_text="Type d'assuré : 'client' ou 'personnel' (grilles différenciées)")
    taux_surprime = serializers.DecimalField(
        max_digits=5, decimal_places=3,
        required=False, default=0, min_value=0,
        help_text="Taux de surprime en % (défaut: 0)")

    periodicite_remboursement = serializers.ChoiceField(
        choices=['mensuel', 'trimestriel', 'semestriel', 'annuel'],
        required=False, allow_blank=True,
        help_text="Périodicité du remboursement du prêt")

    # ===========================================================
    # DATES
    # ===========================================================
    date_effet = serializers.DateField(required=False, allow_null=True,
        help_text="Date d'effet de la garantie (défaut: aujourd'hui)")
    date_octroi = serializers.DateField(required=False, allow_null=True,
        help_text="Date de mise en place / octroi du prêt")
    date_premiere_echeance = serializers.DateField(required=False, allow_null=True,
        help_text="Date de la première échéance")
    origine_des_fonds = serializers.CharField(max_length=200, required=False, allow_blank=True)

    # ===========================================================
    # BÉNÉFICIAIRES
    # ===========================================================
    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # ===========================================================
    # CONTRÔLE
    # ===========================================================
    sauvegarder = serializers.BooleanField(default=True)

    # CHAMPS CALCULÉS (read_only)
    age_emprunteur = serializers.IntegerField(read_only=True)

    # ============================================
    # VALIDATION
    # ============================================
    def validate_beneficiaires(self, value):
        if not value:
            return value
        total = sum(b['part_pourcentage'] for b in value)
        if abs(total - 100) > 0.01:
            raise serializers.ValidationError(
                f"La somme des parts doit être 100% (actuellement : {total}%)")
        return value

    def validate(self, attrs):
        # date_effet : valeur client ou aujourd'hui
        date_effet = attrs.get("date_effet") or date.today()
        attrs["date_effet"] = date_effet

        date_naissance = attrs["date_naissance"]

        if date_naissance >= date_effet:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date d'effet.")

        age = (
            date_effet.year - date_naissance.year
            - ((date_effet.month, date_effet.day) < (date_naissance.month, date_naissance.day))
        )

        if age < 18:
            raise serializers.ValidationError(
                "L'emprunteur doit avoir au moins 18 ans à la date d'effet.")
        if age > 64:
            raise serializers.ValidationError(
                "L'âge limite pour l'assurance emprunteur est 64 ans.")

        attrs["age_emprunteur"] = age

        date_octroi = attrs.get("date_octroi")
        date_premiere_echeance = attrs.get("date_premiere_echeance")

        if date_octroi and date_octroi > date_effet:
            raise serializers.ValidationError(
                "La date d'octroi ne peut pas être postérieure à la date d'effet.")

        if date_octroi and date_premiere_echeance:
            if date_premiere_echeance < date_octroi:
                raise serializers.ValidationError(
                    "La date de première échéance ne peut pas être antérieure à la date d'octroi.")

        return attrs


# =============================================
# RETRAITE — corrigé
# =============================================

class SimulateurRetraiteInputSerializer(serializers.Serializer):
    """
    Serializer Confort Retraite — fidèle au Bulletin d'Adhésion NSIA.

    Sections du BIA reproduites :
      RÉSERVÉ NSIA → numéro police, client, code, inspection, conseiller
      I. PARTIE CONTRACTANTE
        1. SOUSCRIPTEUR
        2. ASSURÉ (ou IDEM)
      3. BÉNÉFICIAIRES (au terme + en cas de décès avant le terme)
      II. COTISATION (montant, périodicité, mode paiement, origine fonds)
      III. GARANTIES SOUSCRITES (durée, dates, capital décès)
    """

    # ===========================================================
    # RÉSERVÉ NSIA
    # ===========================================================
    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nom_conseiller     = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_convention  = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # ===========================================================
    # 1. SOUSCRIPTEUR
    # ===========================================================
    assure_est_souscripteur = serializers.BooleanField(default=True,
        help_text="True = le souscripteur est l'assuré (IDEM sur le BIA)")
    souscripteur = serializers.DictField(required=False, allow_null=True,
        help_text="Si assure_est_souscripteur=false : {civilite, nom, prenoms, date_naissance, ...}")

    # ===========================================================
    # 2. ASSURÉ (identité + contacts)
    # ===========================================================
    titre_assure           = serializers.ChoiceField(choices=['M', 'MME', 'MLLE'], required=False)
    nom                    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom                 = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance         = serializers.DateField(help_text="Date de naissance de l'assuré")
    lieu_naissance         = serializers.CharField(max_length=100, required=False, allow_blank=True)
    situation_matrimoniale = serializers.ChoiceField(
        choices=['celibataire', 'marie', 'divorce', 'veuf'],
        required=False, allow_blank=True)

    adresse_geographique   = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale        = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cellulaire             = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_domicile     = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau       = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mobile                 = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email                  = serializers.EmailField(required=False, allow_blank=True)
    email_professionnel    = serializers.EmailField(required=False, allow_blank=True)

    profession             = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur              = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur      = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur    = serializers.CharField(max_length=20, required=False, allow_blank=True)
    numero_compte          = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # 2 correspondants côté souscripteur, 1 côté assuré
    correspondant_nom       = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_mobile    = serializers.CharField(max_length=20, required=False, allow_blank=True)

    deja_souscrit_nsia = serializers.BooleanField(default=False,
        help_text="L'assuré a-t-il déjà un contrat NSIA ?")
    details_contrat_nsia = serializers.CharField(max_length=255, required=False, allow_blank=True,
        help_text="Type de contrat + numéro de police")

    # ===========================================================
    # 3. BÉNÉFICIAIRES
    # ===========================================================
    # Au terme du contrat
    beneficiaire_terme_assure = serializers.BooleanField(default=True,
        help_text="True = bénéficiaire au terme est l'assuré")
    beneficiaires_terme = serializers.ListField(
        child=serializers.DictField(),
        required=False, allow_empty=True,
        help_text="Si beneficiaire_terme_assure=false : [{nom_prenoms, qualite, part_pourcentage}, ...]")

    # En cas de décès avant le terme
    beneficiaire_deces_conjoint = serializers.BooleanField(default=False,
        help_text="Mon conjoint non divorcé, ni séparé de corps (mariage civil uniquement)")
    beneficiaire_deces_enfants  = serializers.BooleanField(default=False,
        help_text="Mes enfants nés ou à naître")
    beneficiaire_deces_autres   = serializers.BooleanField(default=False,
        help_text="Autres bénéficiaires en cas de décès")
    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # ===========================================================
    # II. COTISATION
    # ===========================================================
    prime_periodique_commerciale = serializers.DecimalField(
        max_digits=15, decimal_places=2, min_value=1000,
        help_text="Combien souhaitez-vous cotiser ? (FCFA)")
    periodicite = serializers.ChoiceField(
        choices=['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'],
        help_text="Périodicité de cotisation (mensuelle = chèque exclus)")
    mode_paiement = serializers.ChoiceField(
        choices=['prelevement_salaire', 'prelevement_bancaire', 'cheque'],
        required=False, allow_blank=True,
        help_text="Prélèvement sur salaire, Prélèvement bancaire, Chèque")
    origine_des_fonds = serializers.CharField(max_length=200, required=False, allow_blank=True)

    # ===========================================================
    # III. GARANTIES SOUSCRITES
    # ===========================================================
    duree = serializers.IntegerField(
        min_value=1, max_value=40,
        help_text="Durée du contrat en années")
    capital_deces = serializers.DecimalField(
        max_digits=15, decimal_places=2,
        required=False, default=0, min_value=0,
        help_text="Capital décès (plafonné à 10x cotisation annuelle, max 10M)")
    date_premiere_cotisation = serializers.DateField(required=False, allow_null=True)

    # ===========================================================
    # CONTRÔLE
    # ===========================================================
    sauvegarder = serializers.BooleanField(default=True)

    # ===========================================================
    # CHAMPS CALCULÉS (read_only)
    # ===========================================================
    age            = serializers.IntegerField(read_only=True)
    date_signature = serializers.DateField(read_only=True)
    date_effet     = serializers.DateField(read_only=True)
    date_fin       = serializers.DateField(read_only=True)

    # ===========================================================
    # VALIDATION
    # ===========================================================
    def validate(self, attrs):
        # --- Dates calculées automatiquement ---
        # Règle NSIA : date d'effet immédiate (= date de signature)
        attrs['date_signature'] = date.today()
        attrs['date_effet']     = attrs['date_signature']

        date_effet     = attrs['date_effet']
        date_naissance = attrs['date_naissance']

        if date_naissance >= date_effet:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date d'effet.")

        # --- Calcul âge ---
        age = (
            date_effet.year - date_naissance.year
            - ((date_effet.month, date_effet.day) < (date_naissance.month, date_naissance.day))
        )
        if age < 18 or age > 65:
            raise serializers.ValidationError(
                f"Âge invalide ({age} ans). L'âge doit être compris entre 18 et 65 ans.")
        attrs['age'] = age

        duree = attrs['duree']
        if age + duree > 65:
            raise serializers.ValidationError(
                f"L'assuré aura {age + duree} ans à la fin du contrat. "
                "L'âge maximum en fin d'engagement est 65 ans.")

        # --- Date première cotisation : défaut = date_effet ---
        if not attrs.get('date_premiere_cotisation'):
            attrs['date_premiere_cotisation'] = date_effet

        # --- Date de fin : date_effet + durée d'engagement ---
        # Règle NSIA : afficher la date de fin sur le BIA Retraite
        attrs['date_fin'] = date_effet + relativedelta(years=duree)

        # --- Compatibilité calculateur ---
        PERIODICITE_MAP = {'mensuelle': 'M', 'trimestrielle': 'T', 'semestrielle': 'S', 'annuelle': 'A'}
        attrs['periodicite_code'] = PERIODICITE_MAP.get(attrs['periodicite'], 'M')

        return attrs


# =============================================
# ÉTUDES — corrigé
# =============================================

class SimulateurEtudesInputSerializer(serializers.Serializer):
    """
    Serializer Confort Études — fidèle au Bulletin d'Adhésion NSIA (BIA).

    Sections du BIA reproduites :
      RÉSERVÉ NSIA → numéro client, conseiller, convention
      1. PARTIES CONTRACTANTES (souscripteur)
      2. ASSURÉ (ou IDEM si = souscripteur)
      3. BÉNÉFICIAIRES (au terme + en cas de décès)
      II. GARANTIES SOUSCRITES (rente, durées, primes)
      PAIEMENT (mode, périodicité, origine des fonds)
    """

    # ===========================================================
    # RÉSERVÉ NSIA
    # ===========================================================
    numero_client_nsia = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nom_conseiller     = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_convention  = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # ===========================================================
    # 1. PARTIES CONTRACTANTES (Souscripteur)
    # ===========================================================
    assure_est_souscripteur = serializers.BooleanField(default=True,
        help_text="True = le souscripteur est l'assuré (IDEM sur le BIA)")
    souscripteur = serializers.DictField(required=False, allow_null=True,
        help_text="Si assure_est_souscripteur=false : {civilite, nom, prenoms, date_naissance, lieu_naissance, ...}")

    # ===========================================================
    # 2. ASSURÉ (identité + contacts)
    # ===========================================================
    titre_assure           = serializers.ChoiceField(choices=['M', 'MME', 'MLLE'], required=False)
    nom                    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom                 = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_naissance         = serializers.DateField(help_text="Date de naissance de l'assuré")
    lieu_naissance         = serializers.CharField(max_length=100, required=False, allow_blank=True)
    situation_matrimoniale = serializers.ChoiceField(
        choices=['celibataire', 'marie', 'divorce', 'veuf', 'concubin'],
        required=False, allow_blank=True)

    adresse_geographique   = serializers.CharField(max_length=255, required=False, allow_blank=True)
    adresse_postale        = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cellulaire             = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_domicile     = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telephone_bureau       = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email                  = serializers.EmailField(required=False, allow_blank=True)
    email_professionnel    = serializers.EmailField(required=False, allow_blank=True)

    profession             = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur              = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse_employeur      = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telephone_employeur    = serializers.CharField(max_length=20, required=False, allow_blank=True)
    poste_occupe           = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_compte          = serializers.CharField(max_length=50, required=False, allow_blank=True)

    correspondant_nom       = serializers.CharField(max_length=150, required=False, allow_blank=True)
    correspondant_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    correspondant_cellulaire = serializers.CharField(max_length=20, required=False, allow_blank=True)

    deja_souscrit_nsia = serializers.BooleanField(default=False,
        help_text="L'assuré a-t-il déjà un contrat NSIA ?")
    details_contrat_nsia = serializers.CharField(max_length=255, required=False, allow_blank=True,
        help_text="Détails du contrat NSIA existant")

    # ===========================================================
    # 3. BÉNÉFICIAIRES
    # ===========================================================
    # Au terme du contrat : l'assuré ou autres
    beneficiaire_terme_assure = serializers.BooleanField(default=True,
        help_text="True = bénéficiaire au terme est l'assuré")
    beneficiaires_terme = serializers.ListField(
        child=serializers.DictField(),
        required=False, allow_empty=True,
        help_text="Si beneficiaire_terme_assure=false : [{nom_prenoms, qualite, part_pourcentage}, ...]")

    # En cas de décès
    beneficiaires = BeneficiaireInputSerializer(many=True, required=False, allow_empty=True)

    # ===========================================================
    # II. GARANTIES SOUSCRITES
    # ===========================================================
    age_enfant = serializers.IntegerField(
        min_value=0, max_value=18,
        help_text="Âge actuel de l'enfant bénéficiaire (0-18 ans)")
    montant_rente = serializers.DecimalField(
        max_digits=15, decimal_places=2, min_value=100000,
        help_text="Rente annuelle souhaitée en FCFA")
    duree_paiement = serializers.IntegerField(
        min_value=1, max_value=40,
        help_text="Durée de paiement des cotisations en années")
    duree_service = serializers.ChoiceField(
        choices=[3, 4, 5],
        help_text="Durée de service de la rente : 3, 4 ou 5 ans")

    # ===========================================================
    # PAIEMENT
    # ===========================================================
    mode_paiement = serializers.ChoiceField(
        choices=['prelevement_bancaire', 'cheque', 'prelevement_salaire'],
        required=False, allow_blank=True,
        help_text="Prélèvement bancaire, Chèques, Prélèvement sur salaire")
    periodicite = serializers.ChoiceField(
        choices=['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'],
        required=False, allow_blank=True)
    date_premiere_cotisation = serializers.DateField(required=False, allow_null=True)
    origine_des_fonds = serializers.CharField(max_length=200, required=False, allow_blank=True)

    # ===========================================================
    # CONTRÔLE
    # ===========================================================
    sauvegarder = serializers.BooleanField(default=True)

    # ===========================================================
    # CHAMPS CALCULÉS (read_only)
    # ===========================================================
    age_parent     = serializers.IntegerField(read_only=True)
    date_signature = serializers.DateField(read_only=True)
    date_effet     = serializers.DateField(read_only=True)
    date_echeance  = serializers.DateField(read_only=True)
    date_fin       = serializers.DateField(read_only=True)

    # ===========================================================
    # VALIDATION
    # ===========================================================
    def validate(self, attrs):
        # --- Dates calculées automatiquement ---
        # Règle NSIA : date d'effet immédiate (= date de signature)
        attrs['date_signature'] = date.today()
        attrs['date_effet']     = attrs['date_signature']

        date_effet     = attrs['date_effet']
        date_naissance = attrs['date_naissance']

        if date_naissance >= date_effet:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date d'effet.")

        # --- Calcul âge réel ---
        age = (
            date_effet.year - date_naissance.year
            - ((date_effet.month, date_effet.day) < (date_naissance.month, date_naissance.day))
        )
        if age < 18 or age > 65:
            raise serializers.ValidationError(
                f"Âge invalide ({age} ans). L'âge doit être compris entre 18 et 65 ans.")
        attrs['age_parent'] = age

        duree_paiement = attrs['duree_paiement']

        # --- Vérification : âge max 65 ans à la fin du paiement ---
        if age + duree_paiement > 65:
            raise serializers.ValidationError(
                f"Le parent aura {age + duree_paiement} ans à la fin du paiement. "
                "L'âge maximum en fin de contrat est 65 ans."
            )

        # --- duree_service en int (ChoiceField renvoie str) ---
        attrs['duree_service'] = int(attrs['duree_service'])

        # --- Date première cotisation : défaut = date_effet + 1 mois ---
        if not attrs.get('date_premiere_cotisation'):
            attrs['date_premiere_cotisation'] = date_effet + relativedelta(months=1)

        # --- Date d'échéance / Date de fin (fin du contrat après duree_paiement + duree_service) ---
        # Règle NSIA : date_fin = date_effet + durée d'engagement
        # Pour Études, l'engagement = durée de paiement + durée de service de la rente.
        duree_totale = duree_paiement + attrs['duree_service']
        attrs['date_echeance'] = date_effet + relativedelta(years=duree_totale)
        # Alias pour cohérence avec les autres produits (BIA affiche "Date de fin")
        attrs['date_fin'] = attrs['date_echeance']

        return attrs


class SimulationSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Simulation (liste/détail)
    """
    banque_nom = serializers.CharField(source='banque.nom_complet', read_only=True)
    banque_code = serializers.CharField(source='banque.code_banque', read_only=True)
    gestionnaire_nom = serializers.SerializerMethodField()
    produit_display = serializers.CharField(source='get_produit_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    montant_prime = serializers.SerializerMethodField()

    agence_nom = serializers.CharField(source='agence.nom', read_only=True)
    
    class Meta:
        model = Simulation
        fields = [
            'id',
            'reference',
            'banque',
            'banque_nom',
            'banque_code',
            'gestionnaire',
            'gestionnaire_nom',
            'produit',
            'produit_display',
            'statut',
            'statut_display',
            'donnees_entree',
            'resultats_calcul',
            'nom_client',
            'prenom_client',
            'email_client',
            'telephone_client',
            'date_creation',
            'date_modification',
            'date_validation',
            'montant_prime',
            'notes',
            'agence', 
            'agence_nom',
            'lieu_naissance',
            'numero_convention',
            'taux_interet',
            'titre_assure',
            'type_pret'
        ]
        read_only_fields = ['id', 'reference', 'date_creation', 'date_modification', 'agence']
    
    def get_gestionnaire_nom(self, obj):
        """Retourne le nom complet du gestionnaire"""
        if obj.gestionnaire:
            return f"{obj.gestionnaire.first_name} {obj.gestionnaire.last_name}".strip()
        return None
    
    def get_montant_prime(self, obj):
        """Retourne le montant de la prime totale"""
        return obj.get_montant_prime()
    
class SimulationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer pour créer une simulation avec ses bénéficiaires en une seule requête
    
    Exemple de payload :
    {
        "nom_client": "DUPONT",
        "prenom_client": "Jean",
        "donnees_entree": {
            "montant_pret": 20000000,
            "duree_mois": 60,
            "titre_assure": "Monsieur",
            "lieu_naissance": "Brazzaville",
            ...
        },
        "beneficiaires": [
            {
                "qualite": "organisme_pret",
                "nom_prenoms": "Ecobank CONGO",
                "part_pourcentage": 100.00,
                "ordre": 1
            }
        ]
    }
    """

   
    banque_nom = serializers.CharField(source='banque.nom_complet', read_only=True)
    banque_code = serializers.CharField(source='banque.code_banque', read_only=True)
    gestionnaire_nom = serializers.SerializerMethodField()
    produit_display = serializers.CharField(source='get_produit_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    montant_prime = serializers.SerializerMethodField()

    agence_nom = serializers.CharField(source='agence.nom', read_only=True)

    
    beneficiaires = BeneficiaireSerializer(many=True, required=False)
    
    class Meta:
        model = Simulation
        fields = [
            'id',
            'reference',
            'banque',
            'banque_nom',
            'banque_code',
            'gestionnaire',
            'gestionnaire_nom',
            'produit',
            'produit_display',
            'statut',
            'statut_display',
            'donnees_entree',
            'resultats_calcul',
            'nom_client',
            'prenom_client',
            'email_client',
            'telephone_client',
            'date_creation',
            'date_modification',
            'date_validation',
            'montant_prime',
            'notes',
            'agence', 
            'agence_nom',
            'lieu_naissance',
            'numero_convention',
            'taux_interet',
            'titre_assure',
            'type_pret',
            'beneficiaires'
        ]

        read_only_fields = ['id', 'reference', 'date_creation', 'date_modification', 'agence']
    
    def validate_donnees_entree(self, value):
        """
        Valider les nouveaux champs dans donnees_entree
        """
        # Valider titre_assure
        if 'titre_assure' in value:
            if value['titre_assure'] not in ['Monsieur', 'Madame']:
                raise ValidationError({
                    'titre_assure': "Doit être 'Monsieur' ou 'Madame'"
                })
        
        # Valider taux_interet
        if 'taux_interet' in value:
            taux = value['taux_interet']
            try:
                taux_float = float(taux)
                if taux_float < 0 or taux_float > 30:
                    raise ValidationError({
                        'taux_interet': "Le taux d'intérêt doit être entre 0 et 30%"
                    })
            except (ValueError, TypeError):
                raise ValidationError({
                    'taux_interet': "Le taux d'intérêt doit être un nombre"
                })
        
        return value
    
    def validate_beneficiaires(self, value):
        """
        Valider que la somme des parts des bénéficiaires = 100%
        """
        if value:
            total = sum(Decimal(str(b['part_pourcentage'])) for b in value)
            
            # Tolérance de 0.01% pour les erreurs d'arrondi
            if abs(total - Decimal('100.00')) > Decimal('0.01'):
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total}%)"
                )
        
        return value
    
    def create(self, validated_data):
        """
        Créer la simulation et ses bénéficiaires
        """
        beneficiaires_data = validated_data.pop('beneficiaires', [])
        
        # Créer la simulation
        simulation = Simulation.objects.create(**validated_data)
        
        # Créer les bénéficiaires
        for benef_data in beneficiaires_data:
            Beneficiaire.objects.create(
                simulation=simulation,
                **benef_data
            )
        
        # Si aucun bénéficiaire fourni, créer un bénéficiaire par défaut
        if not beneficiaires_data:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)
        
        return simulation
    
    def update(self, instance, validated_data):
        """
        ✅ CORRIGÉ : Mettre à jour la simulation et recalculer si nécessaire
        """
        beneficiaires_data = validated_data.pop('beneficiaires', None)
        
        # Sauvegarder les anciennes données pour détection de changements
        anciennes_donnees = instance.donnees_entree.copy() if instance.donnees_entree else {}
        ancien_produit = instance.produit
        
        # Mettre à jour la simulation
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        print("JE SYUS LE MONDE")
        
        # ============================================
        # RECALCUL AUTOMATIQUE SI NÉCESSAIRE
        # ============================================
        
        # Vérifier si un recalcul est nécessaire
        doit_recalculer = self._doit_recalculer(
            anciennes_donnees=anciennes_donnees,
            nouvelles_donnees=instance.donnees_entree,
            ancien_produit=ancien_produit,
            nouveau_produit=instance.produit
        )

        print("je syus le czlu", instance.donnees_entree)
        print("produit", instance.produit)
        print("object", doit_recalculer)
        
        if doit_recalculer:
            print("CALCUL OU PAS")
            try:
                # Recalculer les résultats comme lors d'une création
                resultats = self._calculer_simulation(instance)
                instance.resultats_calcul = resultats
            except Exception as e:
                # Logger l'erreur mais ne pas bloquer la mise à jour
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors du recalcul de la simulation {instance.id}: {str(e)}")
                # On pourrait aussi raise l'erreur si on veut bloquer la mise à jour
                # raise ValidationError(f"Erreur de recalcul : {str(e)}")
        else:
            print("NE PAS CALCULER")
        
        instance.save()
        
        # Mettre à jour les bénéficiaires si fournis
        if beneficiaires_data is not None:
            # Supprimer les anciens bénéficiaires
            instance.beneficiaires.all().delete()
            
            # Créer les nouveaux
            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=instance,
                    **benef_data
                )
        
        return instance

    def _doit_recalculer(self, anciennes_donnees, nouvelles_donnees, ancien_produit, nouveau_produit):
        """
        Détermine si un recalcul est nécessaire en comparant les données
        
        Returns:
            bool: True si un recalcul est nécessaire
        """
        # Si le produit change, toujours recalculer
        """if ancien_produit != nouveau_produit:
            return True
        
        # Si pas de nouvelles données, pas de recalcul
        if not nouvelles_donnees:
            return False"""
        
        # Définir les champs financiers critiques par produit
        """champs_financiers_par_produit = {
            'epargne_plus': [
                'cotisation_mensuelle',
                'duree_annees',
            ],
            'retraite': [
                'cotisation_mensuelle',
                'age_actuel',
                'age_retraite',
                'date_naissance',
            ],
            'etudes': [
                'cotisation_mensuelle',
                'age_enfant',
                'age_debut_etudes',
                'duree_etudes',
                'date_naissance',
            ],
            'emprunteur': [
                'montant_pret',
                'duree_mois',
                'taux_interet',
                'date_naissance',
                'age',
            ],
            'mobateli': [
                'capital_dtc_iad',
                'duree_engagement',
                'montant_frais_funeraires',
                'date_naissance',
                'age',
            ],
            'elikia': [
                'rente_annuelle',
                'duree_rente',
                'date_naissance'
            ],
        }"""
        
        # Récupérer les champs critiques pour ce produit
        #champs_critiques = champs_financiers_par_produit.get(nouveau_produit, [])
        #print("HELLO CHAMPS", champs_critiques)
        
        # Si le produit n'est pas reconnu, ne pas recalculer par sécurité
        """if not champs_critiques:
            print("PAS DE cHAMPS CRITIQUES")
            return False"""
        
        # Vérifier si au moins un champ critique a changé
        """for champ in champs_critiques:
            ancienne_valeur = anciennes_donnees.get(champ)
            nouvelle_valeur = nouvelles_donnees.get(champ)
            
            # Comparaison avec conversion en string pour éviter les problèmes de types
            if str(ancienne_valeur) != str(nouvelle_valeur):
                return True"""
        
        return True
    
    def _calculer_simulation(self, instance):
        """
        Appelle le calculateur approprié selon le produit et retourne les résultats
        
        Args:
            instance: Instance de Simulation
            
        Returns:
            dict: Résultats du calcul
            
        Raises:
            ValueError: Si le produit n'est pas supporté
            Exception: Si le calcul échoue
        """
        produit = instance.produit
        banque = instance.banque
        donnees = instance.donnees_entree or {}
        
        # Mapping produit → calculateur
        calculateurs_map = {
            'epargne_plus': ('apps.simulateur.services.calculateur_epargne_plus', 'CalculateurEpargnePlus'),
            'retraite': ('apps.simulateur.services.calculateur_retraite', 'CalculateurRetraite'),
            'etudes': ('apps.simulateur.services.calculateur_etudes', 'CalculateurEtudes'),
            'emprunteur': ('apps.simulateur.services.calculateur_emprunteur', 'CalculateurEmprunteur'),
            'mobateli': ('apps.simulateur.services.calculateur_mobateli', 'CalculateurMobateli'),
            'elikia': ('apps.simulateur.services.calculateur_elikia', 'CalculateurElikia'),
        }
        
        if produit not in calculateurs_map:
            raise ValueError(f"Produit non supporté pour le calcul : {produit}")
        
        # Importer dynamiquement le calculateur
        module_path, class_name = calculateurs_map[produit]
        module = __import__(module_path, fromlist=[class_name])
        CalculateurClass = getattr(module, class_name)
        
        # Instancier le calculateur
        calculateur = CalculateurClass(banque)
        
        # Préparer les paramètres selon le produit
        parametres = self._preparer_parametres_calcul(instance, donnees, produit)

        resultats = calculateur.calculer(parametres)
        
        # Calculer (sans détails pour optimiser)
        if produit == "epargne_plus":
            resultats = calculateur.calculer(parametres, avec_details=False)

        print("JE SUUS LE RESULAT",resultats)
        
        return resultats
    
    def _preparer_parametres_calcul(self, instance, donnees, produit):
        """
        Prépare les paramètres pour le calculateur selon le produit
        
        Args:
            instance: Instance de Simulation
            donnees: Dictionnaire donnees_entree
            produit: Type de produit
            
        Returns:
            dict: Paramètres formatés pour le calculateur
        """
        # Paramètres communs à tous les produits
        parametres = {
            'banque': instance.banque,
        }

        print("JE SUIS LES PARAMETRES", parametres)
        
        # Ajouter les informations client si disponibles
        if instance.nom_client:
            parametres['nom'] = instance.nom_client
        if instance.prenom_client:
            parametres['prenom'] = instance.prenom_client
        if instance.telephone_client:
            parametres['telephone'] = instance.telephone_client
        if instance.email_client:
            parametres['email'] = instance.email_client
        
        parametres.update(donnees)

        return parametres

    def get_gestionnaire_nom(self, obj):
        """Retourne le nom complet du gestionnaire"""
        if obj.gestionnaire:
            return f"{obj.gestionnaire.first_name} {obj.gestionnaire.last_name}".strip()
        return None
    
    def get_montant_prime(self, obj):
        """Retourne le montant de la prime totale"""
        return obj.get_montant_prime()

class SimulationDetailSerializer(SimulationSerializer):
    """
    Serializer détaillé pour une simulation (inclut plus d'infos)
    """
    peut_etre_convertie = serializers.SerializerMethodField()
    souscription = serializers.SerializerMethodField()

    beneficiaires = BeneficiaireSerializer(many=True, read_only=True)
    
    # Champs calculés
    total_parts_beneficiaires = serializers.SerializerMethodField()
    beneficiaires_valides = serializers.SerializerMethodField()
    
    
    class Meta(SimulationSerializer.Meta):
        fields = SimulationSerializer.Meta.fields + [
            'peut_etre_convertie',
            'souscription',
            'ip_address',
            'user_agent',
            'beneficiaires',              
            'total_parts_beneficiaires',   
            'beneficiaires_valides',
        ]
    
    
    def get_peut_etre_convertie(self, obj):
        """Indique si la simulation peut être convertie en souscription"""
        return obj.peut_etre_convertie()
    
    def get_souscription(self, obj):
        """Retourne les infos de la souscription si elle existe"""
        if hasattr(obj, 'souscription'):
            return {
                'reference': obj.souscription.reference,
                'statut': obj.souscription.statut,
                'statut_display': obj.souscription.get_statut_display(),
            }
        return None
    
    def get_total_parts_beneficiaires(self, obj):
        """
        Calcule la somme des parts des bénéficiaires
        
        Returns:
            float: Total des parts (devrait être 100.00)
        """
        beneficiaires = obj.beneficiaires.all()
        total = sum(b.part_pourcentage for b in beneficiaires)
        return float(total)
    
    def get_beneficiaires_valides(self, obj):
        """
        Vérifie si les bénéficiaires sont valides (somme = 100%)
        
        Returns:
            dict: {is_valid: bool, message: str}
        """
        is_valid, message = Beneficiaire.valider_somme_parts(obj)
        return {
            'is_valid': is_valid,
            'message': message
        }

class SouscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Souscription
    """
    banque_nom = serializers.CharField(source='banque.nom_complet', read_only=True)
    banque_code = serializers.CharField(source='banque.code_banque', read_only=True)
    gestionnaire_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    simulation_reference = serializers.CharField(source='simulation.reference', read_only=True)
    age_souscripteur = serializers.SerializerMethodField()
    
    class Meta:
        model = Souscription
        fields = [
            'id',
            'reference',
            'simulation',
            'simulation_reference',
            'banque',
            'banque_nom',
            'banque_code',
            'gestionnaire',
            'gestionnaire_nom',
            'statut',
            'statut_display',
            'nom',
            'prenom',
            'date_naissance',
            'age_souscripteur',
            'lieu_naissance',
            'email',
            'telephone',
            'adresse',
            'profession',
            'employeur',
            'numero_compte',
            'documents',
            'numero_police',
            'date_effet_contrat',
            'date_echeance_contrat',
            'montant_prime',
            'donnees_produit',
            'date_souscription',
            'date_validation',
            'date_rejet',
            'motif_rejet',
            'notes',
            'commentaires',
            'date_modification',
        ]
        read_only_fields = [
            'id',
            'reference',
            'date_souscription',
            'date_modification',
            'numero_police',
        ]
    
    def get_gestionnaire_nom(self, obj):
        """Retourne le nom complet du gestionnaire"""
        if obj.gestionnaire:
            return f"{obj.gestionnaire.first_name} {obj.gestionnaire.last_name}".strip()
        return None
    
    def get_age_souscripteur(self, obj):
        """Retourne l'âge du souscripteur"""
        return obj.get_age_souscripteur()

class ConvertirEnSouscriptionSerializer(serializers.Serializer):
    """
    Serializer pour convertir une simulation en souscription
    """
    # Informations obligatoires du souscripteur
    nom = serializers.CharField(max_length=100)
    prenom = serializers.CharField(max_length=100)
    date_naissance = serializers.DateField()
    lieu_naissance = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    email = serializers.EmailField()
    telephone = serializers.CharField(max_length=20)
    adresse = serializers.CharField()
    
    # Informations optionnelles
    profession = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur = serializers.CharField(max_length=200, required=False, allow_blank=True)
    numero_compte = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Documents
    documents = serializers.JSONField(required=False, default=dict)
    
    # Dates
    date_effet_contrat = serializers.DateField(required=False)
    
    # Notes
    notes = serializers.CharField(required=False, allow_blank=True)
    commentaires = serializers.CharField(required=False, allow_blank=True)
    
    def validate_date_naissance(self, value):
        """Valider la date de naissance"""
        if value > date.today():
            raise serializers.ValidationError("La date de naissance ne peut pas être dans le futur")
        return value

class SimulationResultatSerializer(serializers.Serializer):
    """
    Serializer pour les résultats d'une simulation (réponse API)
    """
    simulation = SimulationDetailSerializer(required=False)
    resultats = serializers.JSONField()
    message = serializers.CharField(required=False)

class QuestionnaireMedicalSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour le questionnaire médical
    """
    
    # Champs calculés (read-only)
    imc = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    score_risque = serializers.IntegerField(read_only=True)
    taux_surprime = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    categorie_risque = serializers.CharField(read_only=True)
    statut = serializers.CharField(read_only=True)
    
    # Informations supplémentaires
    categorie_imc = serializers.SerializerMethodField()
    nb_antecedents_medicaux = serializers.SerializerMethodField()
    
    # Dates
    date_remplissage = serializers.DateTimeField(read_only=True)
    date_modification = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = QuestionnaireMedical
        fields = [
            # Identifiants
            'id',
            'simulation',
            'date_remplissage',
            'date_modification',
            
            # Section 1 : Données physiques
            'taille_cm',
            'poids_kg',
            'imc',
            'categorie_imc',
            'tension_arterielle',
            
            # Section 2 : Habitudes
            'fumeur',
            'nb_cigarettes_jour',
            'consomme_alcool',
            'distractions',
            'pratique_sport',
            'type_sport',
            
            # Section 3 : Antécédents médicaux
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
            'infos_complementaires',
            'nb_antecedents_medicaux',
            
            # Résultats
            'score_risque',
            'taux_surprime',
            'categorie_risque',
            'statut',
            'commentaire_medical',
            
            # Métadonnées
            'createur',
        ]
        read_only_fields = [
            'id',
            'imc',
            'score_risque',
            'taux_surprime',
            'categorie_risque',
            'statut',
            'date_remplissage',
            'date_modification',
        ]
    
    def get_categorie_imc(self, obj):
        """Retourne la catégorie IMC en texte"""
        return obj.get_categorie_imc()
    
    def get_nb_antecedents_medicaux(self, obj):
        """Retourne le nombre d'antécédents cochés"""
        return obj.compter_antecedents()
    
    def validate(self, data):
        """
        Validation personnalisée
        """
        # Si fumeur, le nombre de cigarettes doit être renseigné
        if data.get('fumeur') and not data.get('nb_cigarettes_jour'):
            raise serializers.ValidationError({
                'nb_cigarettes_jour': "Obligatoire si fumeur"
            })
        
        # Si pratique sport, le type doit être renseigné
        if data.get('pratique_sport') and not data.get('type_sport'):
            raise serializers.ValidationError({
                'type_sport': "Obligatoire si pratique du sport"
            })
        
        return data
    
    def create(self, validated_data):
        """
        Création avec calcul automatique de la surprime
        """
        # Récupérer l'utilisateur du contexte
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['createur'] = request.user
        
        # Créer le questionnaire
        questionnaire = super().create(validated_data)
        
        # Calculer et appliquer la surprime automatiquement
        calculer_et_appliquer_surprime(questionnaire)
        
        return questionnaire
    
    def update(self, instance, validated_data):
        """
        Mise à jour avec recalcul automatique de la surprime
        """
        # Mettre à jour les champs
        questionnaire = super().update(instance, validated_data)
        
        # Recalculer la surprime
        calculer_et_appliquer_surprime(questionnaire)
        
        return questionnaire

class QuestionnaireMedicalCreateSerializer(serializers.ModelSerializer):
    """
    Serializer simplifié pour la création
    N'expose que les champs nécessaires à la saisie
    """
    
    class Meta:
        model = QuestionnaireMedical
        fields = [
            'simulation',
            
            # Section 1 : Données physiques
            'taille_cm',
            'poids_kg',
            'tension_arterielle',
            
            # Section 2 : Habitudes
            'fumeur',
            'nb_cigarettes_jour',
            'consomme_alcool',
            'distractions',
            'pratique_sport',
            'type_sport',
            
            # Section 3 : Antécédents médicaux
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
            'infos_complementaires',
        ]
    
    def create(self, validated_data):
        """
        Création avec calcul automatique
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['createur'] = request.user
        
        questionnaire = QuestionnaireMedical.objects.create(**validated_data)
        
        # Calcul automatique
        calculer_et_appliquer_surprime(questionnaire)
        
        return questionnaire

class QuestionnaireMedicalDetailSerializer(QuestionnaireMedicalSerializer):
    """
    Serializer détaillé avec informations de la simulation
    """
    
    # Informations simulation
    simulation_reference = serializers.CharField(source='simulation.reference', read_only=True)
    simulation_statut = serializers.CharField(source='simulation.statut', read_only=True)
    
    # Informations emprunteur
    emprunteur_nom = serializers.CharField(source='simulation.nom', read_only=True)
    emprunteur_prenom = serializers.CharField(source='simulation.prenom', read_only=True)
    
    # Détails du calcul de surprime
    details_calcul = serializers.SerializerMethodField()

    details_medicaux = DetailQ2Serializer(many=True, read_only=True)
    
    # Champs calculés
    nombre_details = serializers.SerializerMethodField()
    questions_avec_details = serializers.SerializerMethodField()
    
    
    class Meta(QuestionnaireMedicalSerializer.Meta):
        fields = QuestionnaireMedicalSerializer.Meta.fields + [
            'simulation_reference',
            'simulation_statut',
            'emprunteur_nom',
            
            'emprunteur_prenom',
            'details_calcul',
            'details_medicaux', 'nombre_details', 'questions_avec_details'
        
        ]
    
    def get_details_calcul(self, obj):
        """
        Retourne le détail du calcul de surprime pour transparence
        """
        from apps.simulateur.services.calculateur_surprime import CalculateurSurprime
        
        calculateur = CalculateurSurprime()
        resultats = calculateur.calculer_surprime(obj)
        
        return resultats.get('details', {})
    
    def get_nombre_details(self, obj):
        """Nombre de détails médicaux renseignés"""
        return obj.details_medicaux.count()
    
    def get_questions_avec_details(self, obj):
        """Liste des questions ayant des détails"""
        details = obj.details_medicaux.all()
        return [
            {
                'question_field': d.question_field,
                'question_label': d.question_label,
                'precisez': d.precisez
            }
            for d in details
        ]

class ResultatSurprimeSerializer(serializers.Serializer):
    """
    Serializer pour les résultats du calcul de surprime
    """
    score_risque = serializers.IntegerField()
    taux_surprime = serializers.DecimalField(max_digits=5, decimal_places=2)
    categorie_risque = serializers.CharField()
    details = serializers.DictField()
    
    # Informations simulation
    prime_base = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    montant_surprime = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    prime_totale = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

class BaremeSurprimeSerializer(serializers.Serializer):
    """
    Serializer pour afficher le barème complet
    """
    imc = serializers.DictField()
    fumeur = serializers.DictField()
    alcool = serializers.DictField()
    antecedents = serializers.DictField()
    bonus_critiques = serializers.DictField()
    tranches_surprime = serializers.ListField()

class EpargnePlusInputSerializer(serializers.Serializer):

    # ============================================
    # CHAMPS FINANCIERS
    # ============================================
    cotisation_mensuelle = serializers.IntegerField(
        required=True,
        min_value=5000,
        help_text="Cotisation mensuelle en FCFA (minimum 5.000)"
    )

    duree_annees = serializers.IntegerField(
        required=True,
        min_value=5,
        max_value=30,
        help_text="Durée du contrat en années (5-30)"
    )

    periodicite = serializers.ChoiceField(
        choices=['A', 'M', 'T', 'S'],
        required=False,
        allow_blank=True,
        help_text="A=Annuelle, M=Mensuelle, T=Trimestrielle, S=Semestrielle"
    )

    mode_paiement = serializers.CharField(
        max_length=50,
        required=True,
        allow_blank=False,
        help_text="Prélèvement bancaire | Prélèvement sur salaire | Chèques"
    )

    origine_fonds = serializers.CharField(
        max_length=50,
        required=True,
        allow_blank=False,
        help_text="Origine des fonds : Salaire, Héritage, etc."
    )

    # ============================================
    # DATES CONTRAT (INPUT client)
    # ============================================
    date_effet = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="Date d'effet (défaut: aujourd'hui)"
        # ✅ CORRIGÉ : retire default=date.today, validate() décide
    )

    date_premiere_cotisation = serializers.DateField(
        help_text="Date de la première cotisation (YYYY-MM-DD)"
    )

    # ✅ CORRIGÉ : champ calculé → read_only
    age            = serializers.IntegerField(read_only=True)
    date_echeance  = serializers.DateField(read_only=True)
    date_fin       = serializers.DateField(read_only=True)

    # ============================================
    # CLIENT
    # ✅ CORRIGÉ : une seule déclaration par champ
    # ============================================
    date_naissance = serializers.DateField(
        help_text="Date de naissance (YYYY-MM-DD)"
        # ✅ CORRIGÉ : obligatoire (nécessaire pour calculer l'âge)
    )

    titre_assure           = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    nom                    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom                 = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email                  = serializers.EmailField(required=False, allow_blank=True)
    telephone              = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    lieu_naissance         = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_compte          = serializers.CharField(max_length=50,  required=False, allow_blank=True)
    numero_compte_cle      = serializers.CharField(max_length=50,  required=False, allow_blank=True)
    banque_client          = serializers.CharField(max_length=50,  required=False, allow_blank=True)
    agence_client          = serializers.CharField(max_length=50,  required=False, allow_blank=True)
    profession             = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employeur              = serializers.CharField(max_length=150, required=False, allow_blank=True)
    situation_matrimoniale = serializers.CharField(max_length=50,  required=False, allow_blank=True)
    adresse_postale        = serializers.CharField(max_length=255, required=False, allow_blank=True)
    numero_convention      = serializers.CharField(max_length=50,  required=False, allow_blank=True)

    # ============================================
    # CONTRATS NSIA EXISTANTS
    # ============================================
    deja_souscrit_nsia = serializers.BooleanField(
        required=True,
        help_text="A déjà souscrit un contrat NSIA Vie ?"
    )

    contrats_nsia_existants = serializers.CharField(
        max_length=200,
        required=False,       # ✅ CORRIGÉ : conditionnel selon deja_souscrit_nsia
        allow_blank=True,
        help_text="Type de contrat et numéro de police (si deja_souscrit_nsia=True)"
    )

    # ============================================
    # BÉNÉFICIAIRES & OPTIONS
    # ============================================
    beneficiaires = BeneficiaireInputSerializer(
        many=True,
        required=False,
        allow_empty=True
    )

    avec_details = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Retourner le détail mois par mois"
    )

    sauvegarder = serializers.BooleanField(
        default=True,
        help_text="Sauvegarder la simulation dans l'historique"
    )

    # ============================================
    # VALIDATION
    # ============================================

    def validate(self, attrs):

        # ✅ date_effet : valeur client ou aujourd'hui
        date_effet = attrs.get("date_effet") or date.today()
        attrs["date_effet"] = date_effet

        date_naissance = attrs["date_naissance"]

        if date_naissance >= date_effet:
            raise serializers.ValidationError(
                "La date de naissance doit être antérieure à la date d'effet."
            )

        # ✅ Calcul âge exact à la date d'effet
        age = (
            date_effet.year - date_naissance.year
            - (
                (date_effet.month, date_effet.day)
                < (date_naissance.month, date_naissance.day)
            )
        )

        if age < 18 or age > 65:
            raise serializers.ValidationError(
                f"Âge invalide ({age} ans). L'âge doit être compris entre 18 et 65 ans."
            )

        # ✅ Vérification âge à la fin du contrat
        duree_annees = attrs["duree_annees"]
        if age + duree_annees > 65:
            raise serializers.ValidationError(
                f"L'assuré aura {age + duree_annees} ans à la fin du contrat. "
                "L'âge maximum en fin d'engagement est 65 ans."
            )

        attrs["age"] = age

        # ✅ date_premiere_cotisation >= date_effet
        date_premiere_cotisation = attrs.get("date_premiere_cotisation")
        if date_premiere_cotisation and date_premiere_cotisation < date_effet:
            raise serializers.ValidationError(
                "La date de première cotisation ne peut pas être antérieure à la date d'effet."
            )

        # ✅ Règle NSIA : date_echeance / date_fin = date_effet + durée du placement
        # Affichée sur le BIA pour informer le client du terme du contrat
        attrs["date_echeance"] = date_effet + relativedelta(years=duree_annees)
        attrs["date_fin"]      = attrs["date_echeance"]

        # ✅ CORRIGÉ : contrats_nsia_existants obligatoire seulement si deja_souscrit_nsia=True
        deja_souscrit = attrs.get("deja_souscrit_nsia", False)
        contrats = attrs.get("contrats_nsia_existants", "").strip()

        if deja_souscrit and not contrats:
            raise serializers.ValidationError(
                "Veuillez préciser le type de contrat et le numéro de police "
                "(champ 'contrats_nsia_existants' obligatoire si deja_souscrit_nsia=True)."
            )

        if not deja_souscrit:
            # On neutralise la valeur pour ne pas stocker de données parasites
            attrs["contrats_nsia_existants"] = ""

        return attrs

class EpargnePlusOutputSerializer(serializers.Serializer):
    """
    Serializer pour le résultat d'une simulation Épargne Plus
    """
    # Cotisations
    cotisation_mensuelle = serializers.FloatField()
    duree_annees = serializers.IntegerField()
    duree_mois = serializers.IntegerField()
    nombre_versements = serializers.IntegerField()
    
    # Montants
    cotisations_brutes_totales = serializers.FloatField()
    frais_total = serializers.FloatField()
    cotisations_nettes_totales = serializers.FloatField()
    interets_acquis = serializers.FloatField()
    capital_final = serializers.FloatField()
    frais_adhesion = serializers.IntegerField()
    
    # Rendement
    rendement_pourcent = serializers.FloatField()
    taux_interet_annuel = serializers.FloatField()
    taux_interet_mensuel = serializers.FloatField()
    
    # Frais
    taux_frais_gestion = serializers.FloatField()
    taux_frais_acquisition = serializers.FloatField()
    taux_frais_tirage = serializers.FloatField()
    taux_frais_total = serializers.FloatField()
    
    # Pénalité
    penalite_rachat_avant = serializers.IntegerField()
    taux_penalite = serializers.FloatField()
    
    # Informations produit
    produit = serializers.CharField()
    produit_display = serializers.CharField()
    banque_code = serializers.CharField()
    banque_nom = serializers.CharField()
    periodicite_tirage = serializers.CharField()
    
    # Évolution mensuelle (optionnelle)
    evolution_mensuelle = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )

class RachatAnticipeInputSerializer(serializers.Serializer):
    """
    Serializer pour calculer un rachat anticipé
    """
    cotisation_mensuelle = serializers.IntegerField(
        required=True,
        min_value=5000,
        help_text="Cotisation mensuelle en FCFA"
    )
    
    duree_annees = serializers.IntegerField(
        required=True,
        min_value=5,
        help_text="Durée prévue du contrat en années"
    )
    
    mois_rachat = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text="Mois du rachat anticipé (1-based)"
    )


class RachatAnticipeOutputSerializer(serializers.Serializer):
    """
    Serializer pour le résultat d'un rachat anticipé
    """
    mois_rachat = serializers.IntegerField()
    annees_rachat = serializers.FloatField()
    valeur_avant_penalite = serializers.FloatField()
    avec_penalite = serializers.BooleanField()
    penalite = serializers.FloatField()
    montant_net_rachat = serializers.FloatField()
    cotisations_versees = serializers.FloatField()


class RachatPartielInputSerializer(serializers.Serializer):
    cotisation_mensuelle = serializers.IntegerField(required=True)
    duree_annees = serializers.IntegerField(required=True)
    mois_rachat = serializers.IntegerField(required=True)
    pourcentage_rachat = serializers.FloatField(
        required=True,
        min_value=0.01,
        max_value=100.0,
        help_text="Pourcentage à racheter (ex: 50.0 pour 50%)"
    )