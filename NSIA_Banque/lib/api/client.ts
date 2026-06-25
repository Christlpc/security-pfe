import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/utils/constants";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";

// Créer une instance axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Pour les cookies httpOnly
});

// Intercepteur de requête
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    if (tokens?.access && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variables pour gérer le rafraîchissement multiple de tokens
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur de réponse
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Erreur 401 - Token expiré
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = "Bearer " + token;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const success = await refreshToken();

        if (!success) {
          throw new Error("Refresh failed");
        }

        const { tokens } = useAuthStore.getState();
        const accessToken = tokens?.access;

        if (accessToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken || null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Détection des erreurs réseau (CORS ou autres)
    if (!error.response && error.request) {
      const isCorsError = error.message?.toLowerCase().includes("cors");
      const isNetworkError =
        error.message?.includes("Network Error") ||
        error.code === "ERR_NETWORK" ||
        error.code === "ERR_FAILED" ||
        error.code === "ECONNABORTED";

      if (isCorsError) {
        // Vraie erreur CORS
        const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "l'application";
        toast.error(
          `Erreur CORS: Le serveur backend n'autorise pas les requêtes depuis ${frontendOrigin}. Veuillez contacter l'administrateur.`,
          { duration: 8000 }
        );
      } else if (isNetworkError) {
        // Erreur réseau générique (timeout, serveur down, etc.)
        toast.error(
          "Erreur de connexion au serveur. Veuillez vérifier votre connexion ou réessayer dans quelques instants.",
          { duration: 5000 }
        );
      }
      return Promise.reject(error);
    }

    // Gestion des erreurs
    const skipGlobalError = (originalRequest as any).skipGlobalError;
    if (error.response && !skipGlobalError) {
      const status = error.response.status;
      let data = error.response.data as any;

      // Si la réponse est un Blob (cas des exports PDF), on essaie de lire le JSON d'erreur
      if (data instanceof Blob && data.type === "application/json") {
        try {
          const text = await data.text();
          data = JSON.parse(text);
        } catch (e) {
          console.error("Erreur parsing Blob error:", e);
        }
      }

      switch (status) {
        case 400:
          if (data) {
            // Gérer différents formats de réponse d'erreur
            let errorMessage = "Erreur de validation";

            if (data.detail) {
              errorMessage = data.detail;
            } else if (data.message) {
              errorMessage = data.message;
            } else if (data.error?.message) {
              errorMessage = data.error.message;
            } else {
              // Essayer d'extraire les erreurs de validation
              const errors = Object.values(data).flat() as string[];
              if (errors.length > 0) {
                errorMessage = errors[0];
              }
            }

            // Logger les détails pour le débogage
            console.error("Erreur 400:", {
              url: originalRequest.url,
              method: originalRequest.method,
              data: originalRequest.data,
              response: data,
            });

            // Ne pas afficher de toast pour les erreurs "existe déjà" - elles sont gérées par l'application
            const isExistsError = errorMessage.toLowerCase().includes('existe déjà') ||
              errorMessage.toLowerCase().includes('already exists');

            if (!isExistsError) {
              toast.error(errorMessage);
            }
          } else {
            toast.error("Erreur de validation");
          }
          break;
        case 401:
          // Silently handle 401 as it's handled by the interceptor retry/refresh logic
          // and we don't want to show "Une erreur est survenue" for every expired token
          break;
        case 403:
          // Silently ignore permission errors for admin-only endpoints
          if (!originalRequest.url?.includes('/banques') && !originalRequest.url?.includes('/agences')) {
            toast.error("Accès refusé. Vous n'avez pas les permissions nécessaires.");
          }
          break;
        case 404:
          toast.error("Ressource introuvable");
          break;
        case 500:
          toast.error(data?.detail || data?.message || "Erreur serveur. Veuillez réessayer plus tard.");
          break;
        default:
          toast.error(data?.detail || "Une erreur est survenue");
      }
    } else if (error.request && !skipGlobalError) {
      toast.error("Erreur de connexion. Vérifiez votre connexion internet.");
    }

    return Promise.reject(error);
  }
);




