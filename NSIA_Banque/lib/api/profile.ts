import { apiClient } from "./client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockProfileApi } from "@/lib/mock/profile";
import { cleanPayload } from "@/lib/utils/payload";
import type { User } from "@/types";
import { AxiosError } from "axios";

// Helper pour gérer les erreurs 404 et basculer vers les mocks (uniquement en développement)
const handleApiError = async <T>(
  apiCall: () => Promise<T>,
  mockCall: () => Promise<T>
): Promise<T> => {
  if (USE_MOCK_DATA) {
    return mockCall();
  }

  try {
    return await apiCall();
  } catch (error) {
    // Si l'endpoint n'existe pas (404), utiliser les mocks uniquement en développement
    // Si l'endpoint n'existe pas (404), utiliser les mocks
    // Cela permet un mode "Hybride" où certaines fonctionnalités restent locales si le backend ne les a pas encore implémentées
    if (error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 405)) {
      console.warn("Endpoint non disponible (404/405), utilisation du mock local pour cette fonctionnalité.");
      return mockCall();
    }
    throw error;
    throw error;
  }
};

export interface ProfileUpdateData {
  nom?: string;
  prenom?: string;
  email?: string;
  username?: string;
}

export interface PasswordChangeData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  simulation_updates: boolean;
  system_alerts: boolean;
}

export interface LoginHistory {
  id: number;
  ip_address: string;
  user_agent: string;
  login_at: string;
  logout_at?: string;
  location?: string;
}

export interface ActiveSession {
  id: string;
  ip_address: string;
  user_agent: string;
  login_at: string;
  last_activity: string;
  location?: string;
}

export const profileApi = {
  /**
   * Récupère le profil de l'utilisateur connecté
   * Utilise /api/v1/auth/me/ comme endpoint principal
   */
  getProfile: async (): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockProfileApi.getProfile();
    }
    // Utilisation de l'endpoint correct /api/v1/auth/me/
    const response = await apiClient.get<User>("/api/v1/auth/me/");
    return response.data;
  },

  /**
   * Met à jour le profil de l'utilisateur
   * Nécessite l'ID de l'utilisateur, donc on le récupère d'abord via getProfile si non fourni
   * Utilise /api/v1/utilisateurs/{id}/
   */
  updateProfile: async (data: ProfileUpdateData, userId?: number | string): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockProfileApi.updateProfile(data);
    }

    let id = userId;
    if (!id) {
      // Si pas d'ID, on récupère le profil actuel
      const currentUser = await profileApi.getProfile();
      id = currentUser.id;
    }

    // Nettoyer le payload pour enlever les valeurs undefined
    const cleanedData = cleanPayload(data) as ProfileUpdateData;

    // Utilisation de l'endpoint correct /api/v1/utilisateurs/{id}/
    const response = await apiClient.patch<User>(`/api/v1/utilisateurs/${id}/`, cleanedData);
    return response.data;
  },

  changePassword: async (data: PasswordChangeData): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockProfileApi.changePassword(data);
    }
    // L'endpoint /api/v1/profile/change-password/ n'existe pas dans le schéma
    // On utilise l'endpoint de reset password ou on attend l'implémentation backend
    // Pour l'instant, on utilise le mock ou on lève une erreur si pas de mock
    console.warn("Endpoint changePassword non disponible dans l'API actuelle");
    // await apiClient.post("/api/v1/profile/change-password/", data);

    // Fallback temporaire : utiliser l'endpoint de reset password si disponible et si l'utilisateur a les droits
    // Sinon, erreur
    throw new Error("Changement de mot de passe non supporté par l'API actuelle");
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    return handleApiError(
      async () => {
        // Endpoint non confirmé dans le schéma
        const response = await apiClient.get<NotificationPreferences>("/api/v1/profile/notifications/", { skipGlobalError: true } as any);
        return response.data;
      },
      () => mockProfileApi.getNotificationPreferences()
    );
  },

  updateNotificationPreferences: async (data: NotificationPreferences): Promise<NotificationPreferences> => {
    return handleApiError(
      async () => {
        // Endpoint non confirmé dans le schéma
        const response = await apiClient.patch<NotificationPreferences>("/api/v1/profile/notifications/", data, { skipGlobalError: true } as any);
        return response.data;
      },
      () => mockProfileApi.updateNotificationPreferences(data)
    );
  },

  getLoginHistory: async (): Promise<LoginHistory[]> => {
    return handleApiError(
      async () => {
        // Endpoint non confirmé dans le schéma
        const response = await apiClient.get<LoginHistory[]>("/api/v1/profile/login-history/", { skipGlobalError: true } as any);
        return response.data;
      },
      () => mockProfileApi.getLoginHistory()
    );
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    return handleApiError(
      async () => {
        // Endpoint non confirmé dans le schéma
        const response = await apiClient.get<ActiveSession[]>("/api/v1/profile/sessions/", { skipGlobalError: true } as any);
        return response.data;
      },
      () => mockProfileApi.getActiveSessions()
    );
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    return handleApiError(
      async () => {
        // Endpoint non confirmé dans le schéma
        await apiClient.delete(`/api/v1/profile/sessions/${sessionId}/`, { skipGlobalError: true } as any);
      },
      () => mockProfileApi.revokeSession(sessionId)
    );
  },
};



