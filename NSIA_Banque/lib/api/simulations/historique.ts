import { apiClient } from "../client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockSimulationApi } from "@/lib/mock/simulations";
import { mockSimulations } from "@/lib/mock/data";
import { cleanPayload } from "@/lib/utils/payload";
import type {
  SimulationCreateData,
  SimulationFilters,
  PaginatedResponse,
} from "@/types";
import { SimulationResponse } from "@/src/domain/api/SimulationResponse";

/**
 * API pour la gestion de l'historique des simulations (CRUD)
 * Endpoints: /api/v1/simulations/historique/
 */

// Transformer une simulation API vers le format frontend
interface ApiSimulation {
  id: string;
  reference?: string;
  produit?: string;
  statut?: string;
  date_creation?: string;
  date_modification?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

function transformApiSimulation(apiSim: ApiSimulation): SimulationResponse {
  return {
    ...apiSim,
    // Mapper les champs de date
    created_at: apiSim.created_at || apiSim.date_creation || new Date().toISOString(),
    updated_at: apiSim.updated_at || apiSim.date_modification || new Date().toISOString(),
  } as SimulationResponse;
}

function transformPaginatedSimulations(response: PaginatedResponse<ApiSimulation>): PaginatedResponse<SimulationResponse> {
  return {
    ...response,
    results: response.results.map(transformApiSimulation),
  };
}

export const historiqueApi = {
  /**
   * Récupère la liste des simulations avec pagination et filtres
   * GET /api/v1/simulations/historique/
   */
  getSimulations: async (
    filters?: SimulationFilters
  ): Promise<PaginatedResponse<SimulationResponse>> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.getSimulations(filters);
    }
    const params = new URLSearchParams();
    if (filters?.statut) params.append("statut", filters.statut);
    if (filters?.produit) params.append("produit", filters.produit);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.date_debut) params.append("date_debut", filters.date_debut);
    if (filters?.date_fin) params.append("date_fin", filters.date_fin);
    if (filters?.page) params.append("page", filters.page.toString());
    // page_size optionnel - non dans SimulationFilters mais peut être ajouté dynamiquement
    if ((filters as any)?.page_size) params.append("page_size", (filters as any).page_size.toString());

    const response = await apiClient.get<PaginatedResponse<ApiSimulation>>(
      `/api/v1/simulations/historique/?${params.toString()}`
    );
    return transformPaginatedSimulations(response.data);
  },

  /**
   * Récupère une simulation par son ID
   * GET /api/v1/simulations/historique/{id}/
   */
  getSimulation: async (id: string): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.getSimulation(id);
    }
    const response = await apiClient.get<ApiSimulation>(`/api/v1/simulations/historique/${id}/`);
    return transformApiSimulation(response.data);
  },

  /**
   * Crée une nouvelle simulation
   * POST /api/v1/simulations/historique/
   */
  createSimulation: async (data: SimulationCreateData): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      // Utiliser le mock existant avec un produit par défaut
      return mockSimulationApi.createSimulation("emprunteur", data);
    }
    // Nettoyer le payload pour enlever les valeurs undefined
    const cleanedData = cleanPayload(data) as SimulationCreateData;

    // Mapper les données vers la structure attendue par l'API (imbriquée)
    const apiPayload = {
      nom_client: cleanedData.nom,
      prenom_client: cleanedData.prenom,
      email_client: cleanedData.email,
      telephone_client: cleanedData.telephone,
      adresse_postale: cleanedData.adresse,
      profession: cleanedData.profession,
      employeur: cleanedData.employeur,
      numero_compte: cleanedData.numero_compte,
      situation_matrimoniale: cleanedData.situation_matrimoniale,
      date_naissance: cleanedData.date_naissance,
      produit: cleanedData.produit || "emprunteur", // Fallback si manquant
      donnees_entree: {
        ...cleanedData,
        // On retire les champs clients du donnees_entree pour éviter la duplication inutile
        nom: undefined,
        prenom: undefined,
        email: undefined,
        telephone: undefined,
        adresse: undefined,
        profession: undefined,
        employeur: undefined,
        numero_compte: undefined,
        situation_matrimoniale: undefined,
        date_naissance: undefined,
      }
    };

    const response = await apiClient.post<ApiSimulation>("/api/v1/simulations/historique/", cleanPayload(apiPayload));
    return response.data;
  },

  /**
   * Met à jour une simulation existante
   * PUT /api/v1/simulations/historique/{id}/
   * 
   * Payload plat - uniquement les champs présents seront mis à jour
   * Les bénéficiaires ne sont pas modifiables via ce endpoint
   */
  updateSimulation: async (
    id: string,
    data: Partial<SimulationCreateData>
  ): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.updateSimulation(id, data);
    }

    // Nettoyer le payload pour enlever les valeurs undefined
    const cleanedData = cleanPayload(data) as any;

    // Récupérer banque et produit depuis les données ou la simulation existante
    let banqueId = cleanedData.banque;
    let produit = cleanedData.produit;

    if (!banqueId || !produit) {
      try {
        const existingSimulation = await apiClient.get<any>(`/api/v1/simulations/historique/${id}/`);
        if (!banqueId) banqueId = existingSimulation.data.banque;
        if (!produit) produit = existingSimulation.data.produit;
      } catch (e) {
        console.error("Erreur récupération simulation existante:", e);
      }
    }

    // Mapper les codes produit frontend vers les codes backend acceptés
    const productCodeMapping: Record<string, string> = {
      'confort_retraite': 'retraite',
      'confort_etudes': 'etudes',
      'elikia_scolaire': 'elikia',
      // 'epargne_plus': 'epargne', // Removed: Epargne Plus should be 'epargne_plus' or handled specifically
      // emprunteur, mobateli, epargne_plus restent identiques
    };
    const backendProduit = productCodeMapping[produit] || produit;

    // Construire le payload imbriqué selon l'exemple fourni
    const apiPayload: any = {
      banque: banqueId,
      produit: backendProduit,
      sauvegarder: cleanedData.sauvegarder ?? true,
    };

    // Champs Client Racine
    if (cleanedData.nom !== undefined) apiPayload.nom_client = cleanedData.nom;
    if (cleanedData.prenom !== undefined) apiPayload.prenom_client = cleanedData.prenom;
    if (cleanedData.email !== undefined) apiPayload.email_client = cleanedData.email;
    if (cleanedData.telephone !== undefined) apiPayload.telephone_client = cleanedData.telephone;
    if (cleanedData.numero_compte !== undefined) apiPayload.numero_compte = cleanedData.numero_compte;
    if (cleanedData.lieu_naissance !== undefined) apiPayload.lieu_naissance = cleanedData.lieu_naissance;

    // Champs Données Entrée
    // On initialise avec les données existantes si elles sont déjà présentes (cas du DDD buildPayload)
    const donneesEntree: any = { ...(cleanedData.donnees_entree || {}) };

    // Titre Assure: Put in donnees_entree (like Creation and Postman), NOT at root
    if (cleanedData.titre_assure !== undefined) {
      // Backend expects short codes: 'M', 'Mme', 'Mlle'
      const raw = String(cleanedData.titre_assure);
      const clean = raw.replace(/[^a-zA-Zà-ÿÀ-Ÿ]/g, '').toLowerCase();
      let val = 'M';
      if (clean.includes('mademoiselle') || clean === 'mlle') val = 'Mlle';
      else if (clean.includes('madame') || clean === 'mme') val = 'Mme';

      // Assign to donnees_entree, NOT apiPayload
      donneesEntree.titre_assure = val;
    }

    // Données Client Secondaires (dans donnees_entree)
    if (cleanedData.date_naissance !== undefined) donneesEntree.date_naissance = cleanedData.date_naissance;
    if (cleanedData.situation_matrimoniale !== undefined) donneesEntree.situation_matrimoniale = cleanedData.situation_matrimoniale;
    if (cleanedData.profession !== undefined) donneesEntree.profession = cleanedData.profession;
    if (cleanedData.employeur !== undefined) donneesEntree.employeur = cleanedData.employeur;
    if (cleanedData.adresse !== undefined) donneesEntree.adresse_postale = cleanedData.adresse;
    if (cleanedData.adresse_postale !== undefined) donneesEntree.adresse_postale = cleanedData.adresse_postale;
    if (cleanedData.numero_compte !== undefined) donneesEntree.numero_compte = cleanedData.numero_compte;
    if (cleanedData.lieu_naissance !== undefined) donneesEntree.lieu_naissance = cleanedData.lieu_naissance;

    // === Champs spécifiques (dans donnees_entree) ===

    // EMPRUNTEUR
    if (produit === 'emprunteur') {
      if (cleanedData.numero_convention !== undefined) donneesEntree.numero_convention = cleanedData.numero_convention;
      if (cleanedData.montant_pret !== undefined) donneesEntree.montant_pret = cleanedData.montant_pret;
      if (cleanedData.duree_mois !== undefined) donneesEntree.duree_mois = cleanedData.duree_mois;
      if (cleanedData.taux_interet !== undefined) donneesEntree.taux_interet = cleanedData.taux_interet;
      if (cleanedData.date_octroi !== undefined) donneesEntree.date_octroi = cleanedData.date_octroi;
      if (cleanedData.date_effet !== undefined) donneesEntree.date_effet = cleanedData.date_effet;
      if (cleanedData.date_premiere_echeance !== undefined) donneesEntree.date_premiere_echeance = cleanedData.date_premiere_echeance;
    }

    // ELIKIA SCOLAIRE
    if (produit === 'elikia_scolaire' || produit === 'elikia') {
      const fields = [
        'rente_annuelle', 'age_parent', 'duree_rente', 'duree_engagement',
        'numero_convention', 'date_effet', 'date_signature', 'date_fin',
        'date_premiere_cotisation', 'periodicite', 'mode_paiement', 'origine_fonds',
        'dates_renouvellement',
        'duree_mois', 'date_octroi', 'date_premiere_echeance'
      ];

      fields.forEach(field => {
        if (cleanedData[field] !== undefined) {
          donneesEntree[field] = cleanedData[field];
          // Duplicate to root to ensure backend picks it up
          apiPayload[field] = cleanedData[field];
        }
      });
    }

    // CONFORT ETUDES
    if (produit === 'confort_etudes' || produit === 'etudes') {
      const fields = [
        'age_parent', 'age_enfant', 'montant_rente', 'duree_paiement',
        'duree_service', 'periodicite', 'date_effet', 'date_premiere_cotisation',
        'mode_paiement', 'origine_fonds'
      ];

      fields.forEach(field => {
        if (cleanedData[field] !== undefined) {
          donneesEntree[field] = cleanedData[field];
          // Duplicate to root
          apiPayload[field] = cleanedData[field];
        }
      });
    }

    // CONFORT RETRAITE
    if (produit === 'confort_retraite' || produit === 'retraite') {
      const fields = [
        'prime_periodique_commerciale', 'capital_deces', 'duree', 'age',
        'date_effet', 'date_premiere_cotisation', 'periodicite',
        'mode_paiement', 'origine_fonds'
      ];

      fields.forEach(field => {
        if (cleanedData[field] !== undefined) {
          donneesEntree[field] = cleanedData[field];
          // Duplicate to root
          apiPayload[field] = cleanedData[field];
        }
      });
    }

    // MOBATELI
    if (produit === 'mobateli') {
      const fields = [
        'capital_dtc_iad', 'age', 'duree_engagement', 'montant_frais_funeraires',
        'date_effet', 'date_signature', 'periodicite',
        'numero_convention', 'dates_renouvellement', 'mode_paiement',
        'origine_fonds', 'date_premiere_cotisation', 'date_fin'
      ];
      fields.forEach(field => {
        if (cleanedData[field] !== undefined) {
          donneesEntree[field] = cleanedData[field];
          // Duplicate to root
          apiPayload[field] = cleanedData[field];
        }
      });
    }

    // EPARGNE PLUS
    if (produit === 'epargne_plus') {
      if (cleanedData.cotisation_mensuelle !== undefined) donneesEntree.cotisation_mensuelle = cleanedData.cotisation_mensuelle;
      if (cleanedData.duree_annees !== undefined) donneesEntree.duree_annees = cleanedData.duree_annees;
      if (cleanedData.periodicite !== undefined) donneesEntree.periodicite = cleanedData.periodicite;
      if (cleanedData.date_effet !== undefined) donneesEntree.date_effet = cleanedData.date_effet;
      if (cleanedData.date_premiere_cotisation !== undefined) donneesEntree.date_premiere_cotisation = cleanedData.date_premiere_cotisation;
      if (cleanedData.numero_compte_cle !== undefined) donneesEntree.numero_compte_cle = cleanedData.numero_compte_cle;
      if (cleanedData.deja_souscrit_nsia !== undefined) donneesEntree.deja_souscrit_nsia = cleanedData.deja_souscrit_nsia;
      if (cleanedData.contrats_nsia_existants !== undefined) donneesEntree.contrats_nsia_existants = cleanedData.contrats_nsia_existants;
      if (cleanedData.mode_paiement !== undefined) donneesEntree.mode_paiement = cleanedData.mode_paiement;
      if (cleanedData.origine_fonds !== undefined) donneesEntree.origine_fonds = cleanedData.origine_fonds;
      if (cleanedData.banque_client !== undefined) donneesEntree.banque_client = cleanedData.banque_client;
      if (cleanedData.agence_client !== undefined) donneesEntree.agence_client = cleanedData.agence_client;
      if (cleanedData.avec_details !== undefined) {
        donneesEntree.avec_details = cleanedData.avec_details;
        apiPayload.avec_details = cleanedData.avec_details;
      }
    }

    // LISTE DES BÉNÉFICIAIRES
    // Ajout générique pour tous les produits qui en ont - AU ROOT du payload
    if (cleanedData.beneficiaires !== undefined) {
      apiPayload.beneficiaires = cleanedData.beneficiaires;
    }

    if (Object.keys(donneesEntree).length > 0) {
      apiPayload.donnees_entree = donneesEntree;
    }

    // NOTE: Les bénéficiaires ne sont PAS inclus - non modifiables via cet endpoint

    console.log("--------------- UPDATE SIMULATION DEBUG ---------------");
    console.log("Input data (cleaned):", JSON.stringify(cleanedData, null, 2));
    console.log("Identified Product:", produit);
    console.log("Mapped Backend Product:", backendProduit);
    console.log("Constructed API Payload:", JSON.stringify(apiPayload, null, 2));
    console.log("-------------------------------------------------------");

    const response = await apiClient.put<ApiSimulation>(
      `/api/v1/simulations/historique/${id}/`,
      cleanPayload(apiPayload)
    );
    return response.data;
  },

  /**
   * Supprime une simulation
   * DELETE /api/v1/simulations/historique/{id}/
   */
  deleteSimulation: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.deleteSimulation(id);
    }
    await apiClient.delete(`/api/v1/simulations/historique/${id}/`);
  },

  /**
   * Valide une simulation
   * POST /api/v1/simulations/historique/{id}/valider/
   */
  validateSimulation: async (id: string): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.validateSimulation(id);
    }
    const response = await apiClient.post<ApiSimulation>(
      `/api/v1/simulations/historique/${id}/valider/`,
      {}
    );
    return response.data;
  },

  /**
   * Convertit une simulation en souscription
   * POST /api/v1/simulations/historique/{id}/souscrire/
   */
  souscrireSimulation: async (
    id: string,
    data?: SouscriptionPayload
  ): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.convertSimulation(id);
    }
    const response = await apiClient.post<ApiSimulation>(
      `/api/v1/simulations/historique/${id}/souscrire/`,
      cleanPayload(data || {})
    );
    return response.data;
  },

  /**
   * Récupère les KPI du dashboard
   * GET /api/v1/simulations/historique/dashboard/
   */
  getDashboard: async (): Promise<DashboardData> => {
    if (USE_MOCK_DATA) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const getStatsForStatus = (status: string) => {
        const sims = mockSimulations.filter((s: any) => s.statut === status);
        const count = sims.length;
        const current_month = sims.filter((s: any) => {
          const d = new Date(s.created_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
        // Simple mock for previous month and evolution
        const previous_month = Math.floor(current_month * 0.8);
        const evolution = previous_month ? Math.round(((current_month - previous_month) / previous_month) * 100) : 0;
        return { count, current_month, previous_month, evolution };
      };

      const by_product = mockSimulations.reduce((acc: any, sim: any) => {
        acc[sim.produit] = (acc[sim.produit] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalValidOrConverted = mockSimulations.filter((s: any) => s.statut === 'validee' || s.statut === 'convertie').length;
      const conversion_rate = mockSimulations.length > 0 ? (totalValidOrConverted / mockSimulations.length) * 100 : 0;

      return {
        total: mockSimulations.length,
        by_status: {
          brouillon: getStatsForStatus("brouillon"),
          calculee: getStatsForStatus("calculee"),
          validee: getStatsForStatus("validee"),
          convertie: getStatsForStatus("convertie"),
        },
        by_product,
        conversion_rate,
      };
    }
    const response = await apiClient.get<DashboardData>(
      '/api/v1/simulations/historique/dashboard/'
    );
    return response.data;
  },
};

/**
 * Types pour les données dashboard
 */
export interface DashboardStatusDetail {
  count: number;
  current_month: number;
  previous_month: number;
  evolution: number;
}

export interface DashboardData {
  total: number;
  by_status: {
    brouillon: DashboardStatusDetail;
    calculee: DashboardStatusDetail;
    validee: DashboardStatusDetail;
    convertie: DashboardStatusDetail;
  };
  by_product: Record<string, number>;
  conversion_rate: number;
}

/**
 * Interface pour le payload de souscription
 * Envoyé lors de la conversion d'une simulation en souscription
 */
export interface SouscriptionPayload {
  simulation?: string; // UUID de la simulation
  banque?: string; // UUID de la banque
  gestionnaire?: string; // UUID du gestionnaire
  statut?: string; // Statut de la souscription
  nom?: string;
  prenom?: string;
  date_naissance?: string; // Format: YYYY-MM-DD
  lieu_naissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  documents?: string; // Type de document: "passeport", "carte_identite", etc.
  date_effet_contrat?: string; // Format: YYYY-MM-DD
  date_echeance_contrat?: string; // Format: YYYY-MM-DD
  montant_prime?: string;
  donnees_produit?: Record<string, any> | null;
  date_validation?: string; // Format: ISO 8601
  notes?: string;
  commentaires?: string;
}

