import { apiClient } from "./client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockUserApi } from "@/lib/mock/users";
import { cleanPayload } from "@/lib/utils/payload";
import type { User, UserRole, PaginatedResponse, Banque } from "@/types";

export interface UserCreateData {
  username: string; // Nom d'utilisateur pour la connexion
  email: string;
  password?: string;
  nom: string; // last_name
  prenom: string; // first_name
  role: UserRole;
  banque?: number | string; // banque_id (UUID) - peut être null
  agence?: string; // agence_id (UUID)
  matricule?: string; // Matricule employé
  telephone?: string; // Téléphone de contact
  is_active?: boolean;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  nom?: string;
  prenom?: string;
  role?: UserRole;
  banque?: number | string; // banque_id (UUID)
  agence?: string; // agence_id (UUID)
  matricule?: string;
  telephone?: string;
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  banque?: number | string;
  is_active?: boolean | string;
  page?: number;
  page_size?: number;
}

// Interface pour la réponse brute de l'API
interface ApiUser {
  id: string | number;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nom?: string;
  prenom?: string;
  nom_complet?: string;
  role: string;
  banque?: string | number | {
    id: string | number;
    code_banque?: string;
    code?: string;
    nom_complet?: string;
    nom_court?: string;
    nom?: string;
  };
  banque_details?: {
    id: string | number;
    code_banque: string;
    nom_complet: string;
    nom_court: string;
  };
  est_actif?: boolean;
  is_active?: boolean;
}

// Transformer un utilisateur API vers le format frontend
function transformApiUser(apiUser: ApiUser): User {
  // Déterminer nom/prénom
  let prenom = apiUser.prenom || apiUser.first_name || "";
  let nom = apiUser.nom || apiUser.last_name || "";

  // Si nom_complet existe mais pas prenom/nom
  if (!prenom && !nom && apiUser.nom_complet) {
    const parts = apiUser.nom_complet.split(" ");
    prenom = parts[0] || "";
    nom = parts.slice(1).join(" ") || "";
  }

  // Déterminer la banque
  let banque: Banque | null = null;

  if (apiUser.banque_details) {
    banque = {
      id: apiUser.banque_details.id,
      code: apiUser.banque_details.code_banque || "",
      nom: apiUser.banque_details.nom_complet || apiUser.banque_details.nom_court || "",
      produits_disponibles: [],
    };
  } else if (typeof apiUser.banque === "object" && apiUser.banque !== null) {
    const b = apiUser.banque;
    banque = {
      id: b.id as number | string,
      code: b.code_banque || b.code || "",
      nom: b.nom_complet || b.nom_court || b.nom || "",
      produits_disponibles: [],
    };
  }

  return {
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email || "",
    nom: nom || "Utilisateur",
    prenom: prenom || "",
    role: apiUser.role as UserRole,
    banque: banque as Banque,
    is_active: apiUser.est_actif ?? apiUser.is_active ?? true,
  };
}

// Transformer une liste paginée d'utilisateurs
function transformPaginatedUsers(response: PaginatedResponse<ApiUser>): PaginatedResponse<User> {
  return {
    ...response,
    results: response.results.map(transformApiUser),
  };
}

export const userApi = {
  getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<User>> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.getUsers(filters);
    }
    const params: Record<string, any> = { ...filters };
    if (filters?.is_active !== undefined) {
      params.est_actif = filters.is_active;
      params.is_active = filters.is_active;
    }
    if (filters?.banque !== undefined) {
      params.banque = filters.banque;
      params.banque_id = filters.banque;
      params.id_banque = filters.banque;
    }
    if (filters?.role !== undefined) {
      params.role = filters.role;
      params.role_id = filters.role;
      params.user_role = filters.role;
    }

    const response = await apiClient.get<PaginatedResponse<ApiUser>>("/api/v1/utilisateurs/", {
      params,
    });
    return transformPaginatedUsers(response.data);
  },

  getUser: async (id: number | string): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.getUser(id as any);
    }
    const response = await apiClient.get<ApiUser>(`/api/v1/utilisateurs/${id}/`);
    return transformApiUser(response.data);
  },

  createUser: async (data: UserCreateData): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.createUser(data);
    }
    // Adapter les données pour l'API - utiliser les noms de colonnes exact de la base
    const apiData: Record<string, any> = {
      username: data.username,
      email: data.email,
      first_name: data.prenom,
      last_name: data.nom,
      role: data.role,
      banque: data.banque ? (typeof data.banque === 'string' && !isNaN(Number(data.banque)) ? Number(data.banque) : data.banque) : null,
      agence: data.agence || null,
      matricule: data.matricule || null,
      telephone: data.telephone || null,
      est_actif: data.is_active !== false,
      is_active: data.is_active !== false,
    };
    if (data.password) {
      apiData.password = data.password;
      apiData.password_confirm = data.password;
    }
    const response = await apiClient.post<ApiUser>("/api/v1/utilisateurs/", apiData);
    return transformApiUser(response.data);
  },

  updateUser: async (id: number | string, data: UserUpdateData): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.updateUser((typeof id === 'string' && !isNaN(Number(id)) ? parseInt(id) : id) as any, data);
    }
    // Adapter les données pour l'API
    const apiData: Record<string, any> = {};
    if (data.username !== undefined) apiData.username = data.username;
    if (data.email !== undefined) apiData.email = data.email;
    if (data.prenom !== undefined) apiData.first_name = data.prenom;
    if (data.nom !== undefined) apiData.last_name = data.nom;
    if (data.role !== undefined) apiData.role = data.role;
    if (data.banque !== undefined) {
      apiData.banque = data.banque ? (typeof data.banque === 'string' && !isNaN(Number(data.banque)) ? Number(data.banque) : data.banque) : null;
    }
    if (data.matricule !== undefined) apiData.matricule = data.matricule;
    if (data.agence !== undefined) apiData.agence = data.agence;
    if (data.telephone !== undefined) apiData.telephone = data.telephone;
    if (data.is_active !== undefined) {
      apiData.est_actif = data.is_active;
      apiData.is_active = data.is_active;
    }

    const cleanedData = cleanPayload(apiData);
    const response = await apiClient.patch<ApiUser>(`/api/v1/utilisateurs/${id}/`, cleanedData);
    return transformApiUser(response.data);
  },

  deleteUser: async (id: number | string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.deleteUser(id as any);
    }
    await apiClient.delete(`/api/v1/utilisateurs/${id}/`);
  },

  /**
   * Active un utilisateur
   * POST /api/v1/utilisateurs/{id}/toggle_status/
   */
  activateUser: async (id: number | string): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.activateUser(id as any);
    }
    const user = await userApi.getUser(id);
    if (user.is_active === false) {
      return userApi.toggleStatus(id);
    }
    return user;
  },

  /**
   * Désactive un utilisateur
   * POST /api/v1/utilisateurs/{id}/toggle_status/
   */
  deactivateUser: async (id: number | string): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.deactivateUser(id as any);
    }
    const user = await userApi.getUser(id);
    if (user.is_active !== false) {
      return userApi.toggleStatus(id);
    }
    return user;
  },

  /**
   * Réinitialise le mot de passe d'un utilisateur
   * POST /api/v1/utilisateurs/{id}/reset_password/
   */
  resetPassword: async (id: number | string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return Promise.resolve();
    }
    await apiClient.post(`/api/v1/utilisateurs/${id}/reset_password/`);
  },

  /**
   * Active ou désactive un utilisateur (toggle status)
   * POST /api/v1/utilisateurs/{id}/toggle_status/
   */
  toggleStatus: async (id: number | string): Promise<User> => {
    if (USE_MOCK_DATA) {
      const user = await userApi.getUser(typeof id === "string" ? Number(id) : id);
      if (user.is_active !== false) {
        return mockUserApi.deactivateUser(typeof id === "string" ? Number(id) : id);
      } else {
        return mockUserApi.activateUser(typeof id === "string" ? Number(id) : id);
      }
    }
    const response = await apiClient.post<ApiUser>(`/api/v1/utilisateurs/${id}/toggle_status/`);
    return transformApiUser(response.data);
  },
};
