/**
 * API Simulations - Point d'entrée principal
 * 
 * Ce fichier maintient la compatibilité avec l'ancienne API tout en utilisant
 * la nouvelle structure modulaire en arrière-plan.
 * 
 * @deprecated Pour les nouvelles fonctionnalités, utiliser directement les modules :
 * - produitsApi pour les simulations par produit
 * - historiqueApi pour le CRUD des simulations
 * - exportsApi pour les exports BIA
 * - questionnairesApi pour les questionnaires médicaux
 */

import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockSimulationApi } from "@/lib/mock/simulations";
import type {
  Simulation,
  SimulationCreateData,
  SimulationFilters,
  PaginatedResponse,
  CalculResponse,
  QuestionnaireMedical,
  QuestionnaireResponse,
} from "@/types";
import { SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { historiqueApi, exportsApi, questionnairesApi, souscriptionsApi } from "./simulations/index";

/**
 * API Simulations - Compatibilité ascendante
 * 
 * Cette API est maintenue pour la compatibilité avec le code existant.
 * Elle délègue aux nouveaux modules internes.
 */
export const simulationApi = {
  /**
   * @deprecated Utiliser historiqueApi.getSimulations() à la place
   */
  getSimulations: async (filters?: SimulationFilters): Promise<PaginatedResponse<SimulationResponse>> => {
    return historiqueApi.getSimulations(filters);
  },

  /**
   * @deprecated Utiliser historiqueApi.getSimulation() à la place
   */
  getSimulation: async (id: string): Promise<SimulationResponse> => {
    return historiqueApi.getSimulation(id);
  },

  /**
   * @deprecated Utiliser produitsApi.simulate*() selon le produit à la place
   */
  createSimulation: async (product: string, data: SimulationCreateData): Promise<SimulationResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.createSimulation(product, data);
    }
    // Pour la compatibilité, on crée via historique
    // Note: Les simulations par produit doivent utiliser produitsApi
    return historiqueApi.createSimulation(data);
  },

  /**
   * @deprecated Utiliser historiqueApi.updateSimulation() à la place
   */
  updateSimulation: async (id: string, data: Partial<SimulationCreateData>): Promise<SimulationResponse> => {
    return historiqueApi.updateSimulation(id, data);
  },

  /**
   * @deprecated Utiliser historiqueApi.deleteSimulation() à la place
   */
  deleteSimulation: async (id: string): Promise<void> => {
    return historiqueApi.deleteSimulation(id);
  },

  /**
   * @deprecated Cette méthode n'existe plus dans l'API réelle
   * Utiliser les endpoints de simulation par produit qui calculent automatiquement
   */
  calculatePrime: async (id: string): Promise<CalculResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.calculatePrime(id);
    }
    // Cette méthode n'existe plus dans la nouvelle API
    // Le calcul se fait automatiquement lors de la création via produitsApi
    throw new Error(
      "calculatePrime n'est plus disponible. Utilisez les endpoints de simulation par produit."
    );
  },

  /**
   * @deprecated Utiliser questionnairesApi.createQuestionnaire() à la place
   */
  submitQuestionnaire: async (
    id: string,
    questionnaire: QuestionnaireMedical
  ): Promise<QuestionnaireResponse> => {
    if (USE_MOCK_DATA) {
      return mockSimulationApi.submitQuestionnaire(id, questionnaire);
    }
    // Créer le questionnaire et l'appliquer à la simulation
    const created = await questionnairesApi.createQuestionnaire(id, {
      ...questionnaire,
      // simulation: id, // Plus besoin car passé en argument
    });
    return questionnairesApi.appliquerASimulation(created.id, id);
  },

  /**
   * @deprecated Utiliser historiqueApi.validateSimulation() à la place
   */
  validateSimulation: async (id: string): Promise<SimulationResponse> => {
    return historiqueApi.validateSimulation(id);
  },

  /**
   * @deprecated Utiliser historiqueApi.souscrireSimulation() à la place
   */
  convertSimulation: async (id: string, data?: any): Promise<SimulationResponse> => {
    return historiqueApi.souscrireSimulation(id, data);
  },

  /**
   * @deprecated Utiliser exportsApi.exportBIA() à la place
   */
  exportBIA: async (id: string): Promise<Blob> => {
    return exportsApi.exportBIA(id);
  },

  /**
   * @deprecated Utiliser exportsApi.previewBIA() à la place
   */
  previewBIA: async (id: string): Promise<string> => {
    return exportsApi.previewBIA(id);
  },
};

// Export des APIs modulaires pour compatibilité
export { historiqueApi, exportsApi, questionnairesApi, souscriptionsApi };
export type { BaremeSurprime } from "./simulations/index";
export type { Souscription, SouscriptionStatut, SouscriptionCreateData, SouscriptionUpdateData, SouscriptionFilters } from "./simulations/index";

