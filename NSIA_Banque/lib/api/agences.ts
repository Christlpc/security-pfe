import { apiClient } from "./client";
import { cleanPayload } from "@/lib/utils/payload";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockAgenceApi } from "@/lib/mock/agences";
import type { Agence, PaginatedResponse } from "@/types";

export interface AgenceCreateData {
    banque: string; // UUID of the bank
    code: string;
    nom: string;
    ville: string;
    adresse: string;
    telephone: string;
    email: string;
    active?: boolean;
}

export interface AgenceUpdateData {
    banque?: string;
    code?: string;
    nom?: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    active?: boolean;
}

export const agencesApi = {
    getAgences: async (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        banque?: string;
        active?: boolean;
    }): Promise<PaginatedResponse<Agence>> => {
        if (USE_MOCK_DATA) {
            return mockAgenceApi.getAgences(params);
        }
        try {
            const response = await apiClient.get<PaginatedResponse<Agence>>("/api/v1/agences/", {
                params: {
                    page: params?.page || 1,
                    page_size: params?.page_size || 20,
                    search: params?.search,
                    q: params?.search,
                    nom: params?.search,
                    banque: params?.banque,
                    banque_id: params?.banque,
                    id_banque: params?.banque,
                    active: params?.active,
                    is_active: params?.active,
                    est_actif: params?.active,
                }
            });
            return response.data;
        } catch (error) {
            console.error("[Agences API] Error fetching agences:", error);
            throw error;
        }
    },

    getAgence: async (id: string): Promise<Agence> => {
        if (USE_MOCK_DATA) {
            return mockAgenceApi.getAgence(id);
        }
        const response = await apiClient.get<Agence>(`/api/v1/agences/${id}/`);
        return response.data;
    },

    createAgence: async (data: AgenceCreateData): Promise<Agence> => {
        if (USE_MOCK_DATA) {
            return mockAgenceApi.createAgence(data);
        }
        try {
            const payload = {
                ...data,
                active: data.active ?? true,
            };
            const response = await apiClient.post<Agence>("/api/v1/agences/", payload);
            return response.data;
        } catch (error: any) {
            console.error("[Agences API] Error creating agence:", error.response?.data || error.message);
            throw error;
        }
    },

    updateAgence: async (id: string, data: AgenceUpdateData): Promise<Agence> => {
        if (USE_MOCK_DATA) {
            return mockAgenceApi.updateAgence(id, data);
        }
        const payload = cleanPayload(data);
        const response = await apiClient.patch<Agence>(`/api/v1/agences/${id}/`, payload);
        return response.data;
    },

    deleteAgence: async (id: string): Promise<void> => {
        if (USE_MOCK_DATA) {
            return mockAgenceApi.deleteAgence(id);
        }
        await apiClient.delete(`/api/v1/agences/${id}/`);
    },
};
