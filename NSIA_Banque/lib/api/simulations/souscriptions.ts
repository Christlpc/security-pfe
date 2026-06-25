import { apiClient } from "../client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { cleanPayload } from "@/lib/utils/payload";
import type { PaginatedResponse } from "@/types";

/**
 * Statut d'une souscription
 */
export type SouscriptionStatut = "en_attente" | "en_cours" | "validee" | "rejetee";

/**
 * Souscription complète
 */
export interface Souscription {
  id: string; // UUID
  reference?: string;
  simulation: string; // UUID de la simulation
  simulation_reference?: string;
  banque: string; // UUID
  banque_nom?: string;
  banque_code?: string;
  gestionnaire?: string; // UUID
  gestionnaire_nom?: string;
  statut: SouscriptionStatut;
  statut_display?: string;
  nom: string;
  prenom: string;
  date_naissance: string; // YYYY-MM-DD
  age_souscripteur?: number;
  lieu_naissance?: string;
  email: string;
  telephone: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  documents?: string;
  numero_police?: string | null;
  date_effet_contrat?: string; // YYYY-MM-DD
  date_echeance_contrat?: string | null;
  montant_prime?: string;
  donnees_produit?: {
    banque?: string;
    produit?: string;
    age_parent?: number;
    duree_rente?: number;
    tranche_age?: string;
    prime_totale?: number;
    details_calcul?: {
      formule_prime_totale?: string;
      formule_prime_mensuelle?: string;
      [key: string]: any;
    };
    rente_annuelle?: number;
    capital_garanti?: number;
    prime_mensuelle?: number;
    prime_nette_annuelle?: number;
    [key: string]: any;
  };
  raison_rejet?: string;
  motif_rejet?: string;
  notes?: string;
  commentaires?: string;
  created_at?: string; // Fallback if regular dates aren't present? The JSON has date_souscription
  date_souscription?: string;
  updated_at?: string;
  date_modification?: string;
  created_by?: number;
  validated_by?: number;
  validated_at?: string;
  date_validation?: string | null;
  rejected_by?: number;
  rejected_at?: string;
  date_rejet?: string | null;
}

/**
 * Données pour créer une souscription
 */
export interface SouscriptionCreateData {
  simulation: string; // UUID
  nom: string;
  prenom: string;
  date_naissance: string; // YYYY-MM-DD
  email: string;
  telephone: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  date_effet_contrat: string; // YYYY-MM-DD
}

/**
 * Données pour mettre à jour une souscription
 */
export interface SouscriptionUpdateData {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  date_effet_contrat?: string;
}

/**
 * Filtres pour la liste des souscriptions
 */
export interface SouscriptionFilters {
  statut?: SouscriptionStatut;
  simulation?: string;
  search?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

/**
 * API pour la gestion des souscriptions
 * Endpoints: /api/v1/simulations/souscriptions/
 */
export const souscriptionsApi = {
  /**
   * Récupère la liste des souscriptions avec pagination et filtres
   * GET /api/v1/simulations/souscriptions/
   */
  getSouscriptions: async (
    filters?: SouscriptionFilters
  ): Promise<PaginatedResponse<Souscription>> => {
    if (USE_MOCK_DATA) {
      // Mock implementation
      // Mock implementation using mockSimulations
      // Note: In a real app we would have separate mockSouscriptions
      // Here we map simulations to souscriptions for demo purposes
      await new Promise(resolve => setTimeout(resolve, 500));
      const { mockSimulations } = require("@/lib/mock/data");

      let filtered = mockSimulations.map((s: any) => ({
        id: s.id,
        reference: `SUB-${s.id.padStart(8, '0')}`,
        simulation: s.id,
        banque: s.banque,
        statut: "en_attente",
        nom: s.nom_client,
        prenom: s.prenom_client,
        email: s.email_client,
        telephone: s.telephone_client,
        date_naissance: "1990-01-01",
        montant_prime: s.prime_totale,
        created_at: s.created_at,
        donnees_produit: { produk: s.produit }
      }));

      // Filter by Search
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter((s: any) =>
          (s.nom || "").toLowerCase().includes(search) ||
          (s.prenom || "").toLowerCase().includes(search) ||
          (s.reference || "").toLowerCase().includes(search)
        );
      }

      // Filter by Statut
      if (filters?.statut) {
        filtered = filtered.filter((s: any) => s.statut === filters.statut);
      }

      const page = filters?.page || 1;
      const pageSize = filters?.page_size || 10;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return {
        count: filtered.length,
        next: null,
        previous: null,
        results: paginated as Souscription[],
      };
    }
    const params = new URLSearchParams();
    if (filters?.statut) params.append("statut", filters.statut);
    if (filters?.simulation) params.append("simulation", filters.simulation);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.date_debut) params.append("date_debut", filters.date_debut);
    if (filters?.date_fin) params.append("date_fin", filters.date_fin);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.page_size) params.append("page_size", filters.page_size.toString());
    if (filters?.ordering) params.append("ordering", filters.ordering);

    const response = await apiClient.get<PaginatedResponse<Souscription>>(
      `/api/v1/simulations/souscriptions/?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Crée une nouvelle souscription
   * POST /api/v1/simulations/souscriptions/
   */
  createSouscription: async (data: SouscriptionCreateData): Promise<Souscription> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour createSouscription");
    }
    // Nettoyer le payload pour enlever les valeurs undefined
    const cleanedData = cleanPayload(data) as SouscriptionCreateData;
    const response = await apiClient.post<Souscription>("/api/v1/simulations/souscriptions/", cleanedData);
    return response.data;
  },

  /**
   * Récupère une souscription par son ID
   * GET /api/v1/simulations/souscriptions/{id}/
   */
  getSouscription: async (id: string): Promise<Souscription> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour getSouscription");
    }
    const response = await apiClient.get<Souscription>(
      `/api/v1/simulations/souscriptions/${id}/`
    );
    return response.data;
  },

  /**
   * Met à jour une souscription existante
   * PATCH /api/v1/simulations/souscriptions/{id}/
   */
  updateSouscription: async (
    id: string,
    data: SouscriptionUpdateData
  ): Promise<Souscription> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour updateSouscription");
    }
    // Nettoyer le payload pour enlever les valeurs undefined
    const cleanedData = cleanPayload(data) as SouscriptionUpdateData;
    const response = await apiClient.patch<Souscription>(
      `/api/v1/simulations/souscriptions/${id}/`,
      cleanedData
    );
    return response.data;
  },

  /**
   * Supprime une souscription
   * DELETE /api/v1/simulations/souscriptions/{id}/
   */
  deleteSouscription: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour deleteSouscription");
    }
    await apiClient.delete(`/api/v1/simulations/souscriptions/${id}/`);
  },

  /**
   * Valide une souscription
   * POST /api/v1/simulations/souscriptions/{id}/valider/
   */
  validateSouscription: async (id: string): Promise<Souscription> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour validateSouscription");
    }
    const response = await apiClient.post<Souscription>(
      `/api/v1/simulations/souscriptions/${id}/valider/`
    );
    return response.data;
  },

  /**
   * Rejette une souscription
   * POST /api/v1/simulations/souscriptions/{id}/rejeter/
   */
  rejectSouscription: async (id: string, motif_rejet: string): Promise<Souscription> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour rejectSouscription");
    }
    console.log("📤 Reject payload:", { motif: motif_rejet, id });
    const response = await apiClient.post<Souscription>(
      `/api/v1/simulations/souscriptions/${id}/rejeter/`,
      { motif: motif_rejet }
    );
    return response.data;
  },
};


