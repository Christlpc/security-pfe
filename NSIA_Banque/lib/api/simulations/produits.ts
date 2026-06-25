import { apiClient } from "../client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { cleanPayload } from "@/lib/utils/payload";
import type { Simulation } from "@/types";

// Types pour les requêtes de simulation par produit
export interface EmprunteurSimulationData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  titre_assure?: string;
  numero_compte?: string;
  date_naissance: string; // YYYY-MM-DD
  lieu_naissance?: string;
  situation_matrimoniale?: string;
  profession?: string;
  employeur?: string;
  adresse_postale?: string;

  numero_convention?: string;
  type_pret?: string;
  montant_pret: number;
  duree_mois: number;
  taux_interet?: number;
  date_octroi?: string;
  date_effet?: string;
  date_premiere_echeance?: string;

  beneficiaires?: Beneficiaire[];
  sauvegarder?: boolean;
}

// Type pour un bénéficiaire
export interface Beneficiaire {
  qualite: "conjoint" | "enfant" | "parent" | "autre" | "organisme_pret";
  nom_prenoms: string;
  part_pourcentage: number;
  ordre: number;
}

// Type pour un bénéficiaire dans la réponse API (avec id, dates, etc.)
export interface BeneficiaireResponse extends Beneficiaire {
  id: string;
  simulation: string;
  qualite_display: string;
  date_creation: string;
  date_modification: string;
}

export interface ElikiaSimulationData {
  rente_annuelle: number;
  age_parent: number;
  duree_rente: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  beneficiaires?: Beneficiaire[];
  sauvegarder: boolean;
}

export interface EtudesSimulationData {
  age_parent: number;
  age_enfant: number;
  montant_rente: number;
  duree_paiement: number;
  duree_service: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  beneficiaires?: Beneficiaire[];
  sauvegarder: boolean;
}

export interface MobateliSimulationData {
  capital_dtc_iad: number;
  age: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  beneficiaires?: Beneficiaire[];
  sauvegarder: boolean;
  [key: string]: any;
}

export interface MobateliSurMesureSimulationData {
  volet: 'dtc' | 'dtc_ff';
  date_naissance: string;
  date_souscription?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  // Volet DTC
  prime?: number;
  duree?: number;
  type_prime?: 'annuelle' | 'unique';
  // Volet DTC+FF
  capital?: number;
  sauvegarder: boolean;
}

export interface MobateliSurMesureSimulationResponse {
  simulation?: Simulation;
  resultats: {
    produit: string;
    volet: string;
    volet_label: string;
    age: number;
    // Volet DTC
    prime?: number;
    capital_dtc_iad?: number;
    duree?: number;
    type_prime?: string;
    type_prime_label?: string;
    // Volet DTC+FF
    capital_dtc?: number;
    capital_total?: number;
    frais_funeraires?: { total: number; detail: string };
    // Communs
    frais_accessoires: number;
    prime_totale: number;
    details_calcul?: Record<string, any>;
    [key: string]: any;
  };
  message: string;
}

export interface RetraiteSimulationData {
  prime_periodique_commerciale: number;
  capital_deces: number;
  duree: number;
  periodicite: string;
  age: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sauvegarder: boolean;
}

// Types pour les réponses de simulation par produit
export interface EmprunteurSimulationResponse {
  simulation?: Simulation;
  resultats: {
    age_emprunteur: number;
    taux_applique: number;
    prime_nette: number;
    surprime: number;
    frais_accessoires: number;
    prime_totale: number;
    net_a_debourser: number;
    [key: string]: any;
  };
  message: string;
}

export interface ElikiaSimulationResponse {
  simulation?: Simulation;
  resultats: {
    prime_nette_annuelle: number;
    prime_mensuelle: number;
    prime_totale: number;
    capital_garanti: number;
    rente_annuelle: number;
    age_parent: number;
    duree_rente: number;
    tranche_age: string;
    [key: string]: any;
  };
  message: string;
}

export interface EtudesSimulationResponse {
  simulation?: Simulation;
  resultats: {
    prime_unique: number;
    prime_annuelle: number;
    prime_mensuelle: number;
    montant_rente_annuel: number;
    age_parent: number;
    age_enfant: number;
    duree_paiement: number;
    duree_service: number;
    debut_service: number;
    fin_service: number;
    [key: string]: any;
  };
  message: string;
}

export interface MobateliSimulationResponse {
  simulation?: Simulation;
  resultats: {
    prime_nette: number;
    prime_mensuelle: number;
    capital_dtc_iad: number;
    age: number;
    tranche_age: string;
    [key: string]: any;
  };
  message: string;
}


export interface RetraiteSimulationResponse {
  simulation?: Simulation;
  resultats: {
    [key: string]: any;
  };
  message: string;
}

export interface EpargnePlusSimulationData {
  cotisation_mensuelle: number;
  duree_annees: number;
  periodicite: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  titre_assure?: string;
  banque_client?: string;
  agence_client?: string;
  numero_compte_cle?: string;
  numero_compte?: string;
  date_naissance: string;
  lieu_naissance?: string;
  situation_matrimoniale?: string;
  profession?: string;
  employeur?: string;
  adresse_postale?: string;
  numero_convention?: string;
  date_effet?: string;
  date_premiere_cotisation?: string;
  mode_paiement?: string;
  origine_fonds?: string;
  deja_souscrit_nsia?: boolean;
  contrats_nsia_existants?: string;
  beneficiaires?: Beneficiaire[];
  avec_details?: boolean;
  sauvegarder?: boolean;
}

export interface EpargnePlusSimulationResponse {
  simulation?: Simulation;
  resultats: {
    capital_acquis: number;
    capital_apres_penalite: number;
    cumul_cotisations: number;
    interets_totaux: number;
    nombre_mensualites: number;
    frais_adhesion: number;
    taux_interet_annuel_pourcent: number;
    produit_nom: string;
    [key: string]: any;
  };
  message: string;
}

/**
 * API pour les simulations par produit
 * Endpoints spécifiques pour chaque type de produit d'assurance
 */
export const produitsApi = {
  /**
   * Calcule une simulation Emprunteur (ADI)
   * POST /api/v1/simulations/emprunteur/
   */
  simulateEmprunteur: async (
    data: EmprunteurSimulationData
  ): Promise<EmprunteurSimulationResponse> => {
    if (USE_MOCK_DATA) {
      // Mock implementation - à remplacer par mock si nécessaire
      throw new Error("Mock non implémenté pour simulateEmprunteur");
    }
    const response = await apiClient.post<EmprunteurSimulationResponse>(
      "/api/v1/simulations/emprunteur/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Elikia (BCI)
   * POST /api/v1/simulations/elikia/
   */
  simulateElikia: async (data: ElikiaSimulationData): Promise<ElikiaSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateElikia");
    }
    const response = await apiClient.post<ElikiaSimulationResponse>(
      "/api/v1/simulations/elikia/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Études
   * POST /api/v1/simulations/etudes/
   */
  simulateEtudes: async (data: EtudesSimulationData): Promise<EtudesSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateEtudes");
    }
    const response = await apiClient.post<EtudesSimulationResponse>(
      "/api/v1/simulations/etudes/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Mobateli (BCI)
   * POST /api/v1/simulations/mobateli/
   */
  simulateMobateli: async (
    data: MobateliSimulationData
  ): Promise<MobateliSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateMobateli");
    }
    const response = await apiClient.post<MobateliSimulationResponse>(
      "/api/v1/simulations/mobateli/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Mobateli Sur Mesure (actuariel)
   * POST /api/v1/simulations/mobateli-sur-mesure/
   */
  simulateMobateliSurMesure: async (
    data: MobateliSurMesureSimulationData
  ): Promise<MobateliSurMesureSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateMobateliSurMesure");
    }
    const response = await apiClient.post<MobateliSurMesureSimulationResponse>(
      "/api/v1/simulations/mobateli-sur-mesure/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Retraite
   * POST /api/v1/simulations/retraite/
   */
  simulateRetraite: async (
    data: RetraiteSimulationData
  ): Promise<RetraiteSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateRetraite");
    }
    const response = await apiClient.post<RetraiteSimulationResponse>(
      "/api/v1/simulations/retraite/",
      cleanPayload(data)
    );
    return response.data;
  },

  /**
   * Calcule une simulation Epargne Plus
   * POST /api/v1/simulations/epargne-plus/
   */
  simulateEpargnePlus: async (
    data: EpargnePlusSimulationData
  ): Promise<EpargnePlusSimulationResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour simulateEpargnePlus");
    }
    const response = await apiClient.post<EpargnePlusSimulationResponse>(
      "/api/v1/simulations/epargne-plus/",
      cleanPayload(data)
    );
    return response.data;
  },
};

