import { apiClient } from "../client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockSimulationApi } from "@/lib/mock/simulations";
import type { QuestionnaireMedical, QuestionnaireResponse, PaginatedResponse } from "@/types";

/**
 * Barème de surprime
 */
export interface BaremeSurprime {
  [key: string]: {
    min: number;
    max: number;
    taux: number;
  };
}

export interface QuestionnaireFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

/**
 * API pour la gestion des questionnaires médicaux
 * Endpoints: /api/v1/simulations/questionnaires-medicaux/
 */
export const questionnairesApi = {
  /**
   * Récupère la liste des questionnaires médicaux
   * GET /api/v1/simulations/questionnaires-medicaux/
   * @param simulationId ID de la simulation pour filtrer (via search)
   */
  getQuestionnaires: async (simulationId?: string, reference?: string): Promise<QuestionnaireResponse[]> => {
    if (USE_MOCK_DATA) {
      // @ts-ignore - Mock returns compatible data
      return mockSimulationApi.getQuestionnaires(simulationId);
    }
    const params: any = {};
    if (simulationId) {
      // On garde le filtre explicite sur l'ID
      params.simulation = simulationId;
    }
    if (reference) {
      // On utilise la référence pour la recherche textuelle
      params.search = reference;
    }

    const response = await apiClient.get<any>(
      '/api/v1/simulations/questionnaires-medicaux/',
      { params }
    );

    let results: QuestionnaireResponse[] = [];
    if (Array.isArray(response.data)) {
      results = response.data;
    } else {
      results = response.data.results || [];
    }

    // Force client-side filtering to ensure exact simulation match
    if (simulationId) {
      results = results.filter(q => q.simulation === simulationId);
    }

    return results;
  },

  /**
   * Crée un nouveau questionnaire médical
   * POST /api/v1/simulations/questionnaires-medicaux/
   */
  createQuestionnaire: async (simulationId: string, data: QuestionnaireMedical): Promise<QuestionnaireResponse> => {
    if (USE_MOCK_DATA) {
      // @ts-ignore
      return mockSimulationApi.createQuestionnaire(simulationId, data);
    }
    // L'API attend "simulation" dans le body
    const payload = {
      ...data,
      simulation: simulationId,
    };
    const response = await apiClient.post<QuestionnaireResponse>(
      '/api/v1/simulations/questionnaires-medicaux/',
      payload
    );
    return response.data;
  },

  /**
   * Récupère un questionnaire médical par son ID
   * GET /api/v1/simulations/questionnaires-medicaux/{id}/
   */
  getQuestionnaire: async (id: number): Promise<QuestionnaireResponse> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour getQuestionnaire");
    }
    const response = await apiClient.get<QuestionnaireResponse>(
      `/api/v1/simulations/questionnaires-medicaux/${id}/`
    );
    return response.data;
  },

  /**
   * Met à jour un questionnaire médical
   * PATCH /api/v1/simulations/questionnaires-medicaux/{id}/
   */
  updateQuestionnaire: async (simulationId: string, questionnaireId: number, data: Partial<QuestionnaireMedical>): Promise<QuestionnaireResponse> => {
    if (USE_MOCK_DATA) {
      // @ts-ignore
      return mockSimulationApi.updateQuestionnaire(simulationId, questionnaireId, data);
    }
    // On passe aussi simulationId au cas où, mais c'est surtout l'ID du questionnaire qui compte
    const payload = {
      ...data,
      simulation: simulationId,
    };
    const response = await apiClient.patch<QuestionnaireResponse>(
      `/api/v1/simulations/questionnaires-medicaux/${questionnaireId}/`,
      payload
    );
    return response.data;
  },

  /**
   * Supprime un questionnaire médical
   * DELETE /api/v1/simulations/questionnaires-medicaux/{id}/
   */
  deleteQuestionnaire: async (id: number): Promise<void> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour deleteQuestionnaire");
    }
    await apiClient.delete(`/api/v1/simulations/questionnaires-medicaux/${id}/`);
  },

  /**
   * Applique un questionnaire médical à une simulation
   * POST /api/v1/simulations/questionnaires-medicaux/{id}/appliquer-a-simulation/
   */
  appliquerASimulation: async (questionnaireId: number, simulationId: string): Promise<any> => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({ success: true });
    }
    const response = await apiClient.post(
      `/api/v1/simulations/questionnaires-medicaux/${questionnaireId}/appliquer-a-simulation/`,
      { simulation: simulationId }
    );
    return response.data;
  },

  /**
   * Ajoute des détails à un questionnaire médical (pour les questions répondues 'Oui')
   * POST /api/v1/simulations/questionnaires-medicaux/{id}/details/
   */
  addQuestionnaireDetails: async (questionnaireId: number, data: {
    question_label: string;
    question_field: string;
    precisez: string;
    periode_traitement: string;
    lieu_traitement: string;
  }): Promise<any> => {
    if (USE_MOCK_DATA) {
      // @ts-ignore
      console.log("Mock addDetails", questionnaireId, data);
      return Promise.resolve({ success: true });
    }
    const response = await apiClient.post(
      `/api/v1/simulations/questionnaires-medicaux/${questionnaireId}/details/`,
      data
    );
    return response.data;
  },

  /**
   * Met à jour un détail de questionnaire médical
   * PUT /api/v1/simulations/questionnaires-medicaux/{id}/details/{detail_id}/
   */
  updateQuestionnaireDetail: async (questionnaireId: number, detailId: number, data: {
    question_label: string;
    question_field: string;
    precisez: string;
    periode_traitement: string;
    lieu_traitement: string;
  }): Promise<any> => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({ success: true });
    }
    const response = await apiClient.put(
      `/api/v1/simulations/questionnaires-medicaux/${questionnaireId}/details/${detailId}/`,
      data
    );
    return response.data;
  },

  /**
   * Récupère les détails d'un questionnaire médical
   * GET /api/v1/simulations/questionnaires-medicaux/{id}/details/
   */
  getQuestionnaireDetails: async (questionnaireId: number): Promise<any[]> => {
    if (USE_MOCK_DATA) {
      return [];
    }
    const response = await apiClient.get<any[]>(
      `/api/v1/simulations/questionnaires-medicaux/${questionnaireId}/details/`
    );
    return response.data;
  },

  /**
   * Recalcule la surprime d'un questionnaire médical
   * POST /api/v1/simulations/questionnaires-medicaux/{id}/recalculer-surprime/
   */
  recalculerSurprime: async (id: number): Promise<QuestionnaireMedical> => {
    if (USE_MOCK_DATA) {
      throw new Error("Mock non implémenté pour recalculerSurprime");
    }
    const response = await apiClient.post<QuestionnaireMedical>(
      `/api/v1/simulations/questionnaires-medicaux/${id}/recalculer-surprime/`
    );
    return response.data;
  },

  /**
   * Récupère le barème de surprime
   * GET /api/v1/simulations/questionnaires-medicaux/bareme/
   */
  getBareme: async (): Promise<BaremeSurprime> => {
    if (USE_MOCK_DATA) {
      // Mock barème
      return {
        imc: {
          min: 0,
          max: 18.5,
          taux: 0,
        },
        tabac: {
          min: 0,
          max: 10,
          taux: 5,
        },
      };
    }
    const response = await apiClient.get<BaremeSurprime>(
      "/api/v1/simulations/questionnaires-medicaux/bareme/"
    );
    return response.data;
  },
};
