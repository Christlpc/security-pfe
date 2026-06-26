// Types utilisateur et authentification - correspond à la table core_utilisateur
export interface User {
  id: number | string; // UUID
  username?: string; // Nom d'utilisateur pour la connexion
  email: string;
  nom: string; // last_name
  prenom: string; // first_name
  role: UserRole;
  banque: Banque | null; // banque_id (peut être null)
  matricule?: string; // Matricule employé
  telephone?: string; // Téléphone de contact
  is_active?: boolean; // is_active
  est_actif?: boolean; // est_actif
  date_creation?: string; // date_creation
}

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ADMIN_NSIA"
  | "RESPONSABLE_BANQUE"
  | "GESTIONNAIRE"
  | "SUPPORT";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Types banque - correspond à la table core_banque
export interface Banque {
  id: number | string; // UUID
  code: string; // code_banque
  nom: string; // nom_complet
  nom_court?: string; // nom_court
  email?: string; // email_contact
  telephone?: string; // telephone_contact
  adresse?: string; // adresse
  logo?: string; // URL du logo
  couleur_primaire?: string; // couleur_primaire (#RRGGBB)
  couleur_secondaire?: string; // couleur_secondaire (#RRGGBB)
  police_principale?: string; // police_principale
  statut?: string; // statut (ACTIF, INACTIF, etc.)
  est_active?: boolean; // Computed field
  produits_disponibles: ProduitType[];
  /** Mapping produit → numéro de convention (depuis produits_autorises) */
  conventions?: Record<string, string>;
  nombre_simulations?: number;
  date_partenariat?: string; // Format: "YYYY-MM-DD"
  parametres_specifiques?: Record<string, any>;
}

export interface Agence {
  id: string; // UUID
  banque: string; // UUID banque
  banque_nom?: string; // Read-only from API
  code: string;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  email: string;
  active: boolean;
  date_creation?: string;
}

// Types produits
export type ProduitType =
  | "emprunteur"
  | "confort_retraite"
  | "confort_etudes"
  | "elikia_scolaire"
  | "mobateli"
  | "epargne_plus";

export const PRODUIT_LABELS: Record<ProduitType, string> = {
  emprunteur: "Emprunteur (ADI)",
  confort_retraite: "Confort Retraite",
  confort_etudes: "Confort Études",
  elikia_scolaire: "Elikia Scolaire",
  mobateli: "Mobateli",
  epargne_plus: "Épargne Plus",
};

// Types simulation
export type SimulationStatut = "brouillon" | "calculee" | "validee" | "proposition" | "convertie";

export interface Simulation {
  id: string;
  reference: string;
  produit: ProduitType;
  statut: SimulationStatut;
  // Client fields
  nom_client: string;
  prenom_client: string;
  email_client: string;
  telephone_client: string;
  adresse_postale?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  situation_matrimoniale?: string;
  date_naissance: string; // Kept as is, assuming it maps correctly or needs check

  // Financial fields
  montant_pret?: number;
  duree_mois?: number;
  taux_interet?: number;
  prime_base?: string;
  surprime_taux?: string;
  surprime_montant?: string;
  prime_totale?: string;
  taux_surprime?: number;
  categorie_risque?: string;
  score_total?: number;

  // System fields
  created_at: string; // Maps to date_creation
  updated_at: string; // Maps to date_modification
  created_by: number;
  banque: number | string; // UUID ou number

  // API Response fields (Nested structure)
  donnees_entree?: Record<string, any>;
  resultats_calcul?: Record<string, any>;

  // Backward compatibility (optional, for smooth transition if needed)
  // Additional fields for Etudes and other products
  montant_rente_annuel?: number;
  age_parent?: number;
  age_enfant?: number;
  duree_paiement?: number;
  duree_service?: number;
  debut_service?: number;
  fin_service?: number;
  prime_unique?: string;
  prime_annuelle?: string;

  // Elikia
  rente_annuelle?: number;
  duree_rente?: number;
  prime_nette_annuelle?: number;
  prime_mensuelle?: number;
  capital_garanti?: number;
  capital_unique?: number;
  tranche_age?: string;
  beneficiaires?: {
    id?: string;
    simulation?: string;
    qualite: string;
    qualite_display?: string;
    nom_prenoms: string;
    part_pourcentage: number | string;
    ordre: number;
    date_creation?: string;
    date_modification?: string;
  }[];
  total_parts_beneficiaires?: number;
  beneficiaires_valides?: {
    is_valid: boolean;
    message: string;
  };

  // Emprunteur
  age_emprunteur?: number;
  taux_applique?: number;
  prime_nette?: number;
  surprime?: number; // Montant surprime
  frais_accessoires?: number;
  net_a_debourser?: number;
  date_effet?: string;
  date_premiere_echeance?: string;

  // Mobateli
  capital_dtc_iad?: number;
  age?: number;

  // Retraite
  prime_periodique_commerciale?: number;
  capital_deces?: number;
  duree?: number;
  periodicite?: string;
  periodicite_libelle?: string;
  prime_deces?: number;
  prime_epargne?: number;
}

export interface SimulationCreateData {
  produit?: ProduitType;
  nom: string;
  prenom: string;
  email?: string;
  date_naissance: string;
  date_effet?: string;
  montant_pret?: number;
  duree_mois?: number;
  taux_interet?: number;
  taux_surprime?: number;
  rente_annuelle?: number;
  // Elikia Scolaire & Etudes
  age_parent?: number;
  duree_rente?: number;
  beneficiaires?: {
    qualite: "conjoint" | "enfant" | "parent" | "autre" | "organisme_pret" | "assure" | "enfant_a_naitre";
    nom_prenoms: string;
    part_pourcentage: number;
    ordre: number;
  }[];

  // Confort Etudes
  age_enfant?: number;
  montant_rente?: number;
  duree_paiement?: number;
  duree_service?: number;

  // Mobateli
  capital_dtc_iad?: number;
  age?: number;
  mode_calcul?: 'forfaitaire' | 'sur_mesure';
  volet?: 'dtc' | 'dtc_ff';
  prime_souhaitee?: number;
  duree_sur_mesure?: number;
  type_prime?: 'annuelle' | 'unique';
  capital_sur_mesure?: number;
  date_souscription?: string;

  // Confort Retraite
  prime_periodique_commerciale?: number;
  capital_deces?: number;
  duree?: number;
  periodicite?: string;
  date_premiere_cotisation?: string;
  mode_paiement?: string;
  origine_fonds?: string;

  // Epargne Plus
  cotisation_mensuelle?: number;
  duree_annees?: number;
  numero_compte_cle?: string;
  deja_souscrit_nsia?: boolean;
  contrats_nsia_existants?: string;

  profession?: string;
  employeur?: string;
  adresse?: string;
  telephone?: string;
  numero_compte?: string;
  situation_matrimoniale?: string;
  date_octroi?: string;
  date_premiere_echeance?: string;
  sauvegarder?: boolean;
}

export interface SimulationFilters {
  statut?: SimulationStatut;
  produit?: ProduitType;
  search?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  page_size?: number;
}

// Types questionnaire médical
export interface QuestionnaireMedical {
  taille_cm: number | string;
  poids_kg: number | string;
  tension_arterielle?: string;
  fumeur: boolean;
  nb_cigarettes_jour?: number;
  consomme_alcool: boolean;
  distractions?: string;
  pratique_sport: boolean;
  type_sport?: string;
  a_infirmite: boolean;
  malade_6_derniers_mois: boolean;
  souvent_fatigue: boolean;
  perte_poids_recente: boolean;
  prise_poids_recente: boolean;
  a_ganglions: boolean;
  fievre_persistante: boolean;
  plaies_buccales: boolean;
  diarrhee_frequente: boolean;
  ballonnement: boolean;
  oedemes_membres_inferieurs: boolean;
  essoufflement: boolean;
  a_eu_perfusion: boolean;
  a_eu_transfusion: boolean;
  est_hypertendu?: boolean;
  est_diabetique?: boolean;
  infos_complementaires?: string;
  commentaire_medical?: string;
}

export interface QuestionnaireResponse extends QuestionnaireMedical {
  id: number;
  simulation: string;
  date_remplissage?: string;
  date_modification?: string;
  taux_surprime: number | string; // API returns string "20.00"
  categorie_risque: "faible" | "moyen" | "eleve" | "tres_eleve" | string; // API might return "TRES_ELEVE" (uppercase)
  score_total?: number; // Optional in some responses
  statut?: string;
  details_scoring?: {
    imc_score: number;
    tabac_score: number;
    alcool_score: number;
    antecedents_score: number;
  };
}

// Types calcul
export interface CalculResponse {
  prime_base: string;
  surprime_taux: string;
  surprime_montant: string;
  prime_totale: string;
  details_calcul: Record<string, unknown>;
}

// Types pagination
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Types notification
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// Types pour les réponses de simulation par produit (extensions)
export interface SimulationResultats {
  [key: string]: any;
}

// Types pour les IDs (peuvent être string UUID ou number selon l'API)
export type SimulationId = string | number;

// Types souscriptions
export type SouscriptionStatut = "en_attente" | "validee" | "rejetee";

export interface Souscription {
  id: string; // UUID
  simulation: string; // UUID de la simulation
  nom: string;
  prenom: string;
  date_naissance: string; // YYYY-MM-DD
  email: string;
  telephone: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  date_effet_contrat?: string; // YYYY-MM-DD
  statut: SouscriptionStatut;
  raison_rejet?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  validated_by?: number;
  validated_at?: string;
  rejected_by?: number;
  rejected_at?: string;
}

