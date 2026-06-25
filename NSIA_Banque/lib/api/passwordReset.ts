import { apiClient } from "./client";
import { USE_MOCK_DATA } from "@/lib/utils/config";

/**
 * API pour la réinitialisation de mot de passe
 *
 * Endpoints backend :
 *   POST /api/v1/auth/password-reset-request/   — Demande de réinitialisation (envoi email)
 *   POST /api/v1/auth/password-reset-confirm/   — Confirmation avec token + nouveau mot de passe
 */

export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetResponse {
  message: string;
}

export const passwordResetApi = {
  /**
   * Demande de réinitialisation de mot de passe
   * Envoie un email avec un lien contenant le token
   *
   * Note sécurité : le backend renvoie toujours un message identique,
   * que l'email existe ou non (anti-énumération)
   *
   * Throttle backend : 3 requêtes/heure par IP
   */
  requestReset: async (data: PasswordResetRequestPayload): Promise<PasswordResetResponse> => {
    if (USE_MOCK_DATA) {
      // Simuler un délai pour le mock
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
      };
    }
    const response = await apiClient.post<PasswordResetResponse>(
      "/api/v1/auth/password-reset-request/",
      data
    );
    return response.data;
  },

  /**
   * Confirme la réinitialisation avec le token et le nouveau mot de passe
   *
   * Le token expire après 15 minutes et ne peut être utilisé qu'une seule fois
   *
   * Throttle backend : 5 requêtes/heure par IP
   */
  confirmReset: async (data: PasswordResetConfirmPayload): Promise<PasswordResetResponse> => {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (data.new_password !== data.confirm_password) {
        throw { response: { data: { confirm_password: ["Les mots de passe ne correspondent pas."] } } };
      }
      if (data.new_password.length < 8) {
        throw { response: { data: { new_password: ["Le mot de passe doit contenir au moins 8 caractères."] } } };
      }
      return { message: "Votre mot de passe a été réinitialisé avec succès." };
    }
    const response = await apiClient.post<PasswordResetResponse>(
      "/api/v1/auth/password-reset-confirm/",
      data
    );
    return response.data;
  },
};
