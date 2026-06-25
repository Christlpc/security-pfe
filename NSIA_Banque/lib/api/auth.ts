import { apiClient } from "./client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockAuthApi } from "@/lib/mock/auth";
import { normalizeProductKey } from "@/lib/utils/productLabels";
import type { LoginCredentials, AuthResponse, User, Banque, ProduitType } from "@/types";

// Interface pour un produit autorisé tel que renvoyé par l'API
interface ApiProduitAutorise {
  id?: string;
  est_actif?: boolean;
  numero_convention?: string;
  produit?: {
    id?: string;
    code: string;   // "emprunteur", "retraite", "etudes", "elikia", "mobateli", "epargne"
    nom?: string;
    est_actif?: boolean;
  };
  // Format alternatif (endpoint /auth/me/)
  code?: string;
  nom?: string;
}

// Interface pour la réponse brute de l'API utilisateur
interface ApiUserResponse {
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
  produits_autorises?: ApiProduitAutorise[];
  est_actif?: boolean;
  is_active?: boolean;
}

interface ApiTokenResponse {
  access: string;
  refresh: string;
  user?: ApiUserResponse & {
    produits_autorises?: ApiProduitAutorise[];
  };
}

/**
 * Résultat du mapping des produits autorisés
 */
interface MappedProduitsResult {
  produits: ProduitType[];
  conventions: Record<string, string>;
}

/**
 * Mappe les produits_autorises de l'API vers un tableau de ProduitType frontend
 * ET extrait les numéros de convention associés à chaque produit.
 * Gère les deux formats de réponse :
 *   - Token response : { produit: { code: "retraite" }, numero_convention: "1000359" }
 *   - /auth/me/      : { code: "retraite", nom: "...", numero_convention: "1000359" }
 */
function mapProduitsAutorises(apiProduits?: ApiProduitAutorise[]): MappedProduitsResult {
  if (!apiProduits || apiProduits.length === 0) return { produits: [], conventions: {} };

  const produits: ProduitType[] = [];
  const conventions: Record<string, string> = {};

  for (const item of apiProduits) {
    // Extraire le code selon le format de réponse
    const code = item.produit?.code || item.code;
    if (!code) continue;

    // Normaliser via le mapping existant (ex: "retraite" → "confort_retraite")
    const normalized = normalizeProductKey(code);
    if (normalized && !produits.includes(normalized)) {
      produits.push(normalized);
    }

    // Extraire le numéro de convention
    if (normalized && item.numero_convention) {
      conventions[normalized] = item.numero_convention;
    }
  }

  return { produits, conventions };
}

// Transformer la réponse API en format frontend
function transformApiUser(apiUser: ApiUserResponse): User {
  // Déterminer les valeurs de nom/prénom
  let prenom = apiUser.prenom || apiUser.first_name || "";
  let nom = apiUser.nom || apiUser.last_name || "";

  // Si nom_complet existe mais pas prenom/nom séparés
  if (!prenom && !nom && apiUser.nom_complet) {
    const parts = apiUser.nom_complet.split(" ");
    prenom = parts[0] || "";
    nom = parts.slice(1).join(" ") || "";
  }

  // Mapper les produits autorisés et conventions depuis l'API
  const { produits: produits_disponibles, conventions } = mapProduitsAutorises(apiUser.produits_autorises);

  // Déterminer les détails de la banque
  let banque: Banque;

  if (apiUser.banque_details) {
    banque = {
      id: apiUser.banque_details.id,
      code: apiUser.banque_details.code_banque,
      nom: apiUser.banque_details.nom_complet || apiUser.banque_details.nom_court,
      produits_disponibles,
      conventions,
    };
  } else if (typeof apiUser.banque === "object" && apiUser.banque !== null) {
    const b = apiUser.banque;
    banque = {
      id: b.id,
      code: b.code_banque || b.code || "",
      nom: b.nom_complet || b.nom_court || b.nom || "",
      produits_disponibles,
      conventions,
    };
  } else if (typeof apiUser.banque === "string" || typeof apiUser.banque === "number") {
    banque = {
      id: apiUser.banque,
      code: "UNKNOWN",
      nom: "Banque",
      produits_disponibles,
      conventions,
    };
  } else {
    banque = {
      id: "default",
      code: "NSIA",
      nom: "NSIA Vie Assurances",
      produits_disponibles,
      conventions,
    };
  }

  return {
    id: apiUser.id,
    email: apiUser.email,
    nom: nom || "Utilisateur",
    prenom: prenom || "",
    role: apiUser.role as any,
    banque,
    is_active: apiUser.est_actif ?? apiUser.is_active ?? true,
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (USE_MOCK_DATA) {
      return mockAuthApi.login(credentials);
    }

    // 1. Obtenir les tokens
    const tokenResponse = await apiClient.post<ApiTokenResponse>("/api/v1/token/", credentials);
    console.log("[Auth API] Token response:", tokenResponse.data);

    const tokens = {
      access: tokenResponse.data.access,
      refresh: tokenResponse.data.refresh,
    };

    // 2. Si l'utilisateur est dans la réponse token, l'utiliser
    if (tokenResponse.data.user) {
      console.log("[Auth API] User from token response:", tokenResponse.data.user);

      // Fusionner produits_autorises dans apiUser (peut être au niveau user ou racine)
      const apiUser: ApiUserResponse = {
        ...tokenResponse.data.user,
        produits_autorises:
          tokenResponse.data.user.produits_autorises || [],
      };

      const transformedUser = transformApiUser(apiUser);
      console.log("[Auth API] Transformed user:", transformedUser);
      console.log("[Auth API] Produits disponibles:", transformedUser.banque?.produits_disponibles);
      return {
        access: tokens.access,
        refresh: tokens.refresh,
        user: transformedUser,
      };
    }

    // 3. Sinon, récupérer le profil utilisateur avec le nouveau token
    console.log("[Auth API] Fetching user profile...");
    try {
      const profileResponse = await apiClient.get<ApiUserResponse>("/api/v1/profile/me/", {
        headers: {
          Authorization: "Bearer " + tokens.access,
        },
      });
      console.log("[Auth API] Profile response:", profileResponse.data);
      const transformedUser = transformApiUser(profileResponse.data);
      console.log("[Auth API] Transformed user:", transformedUser);
      return {
        access: tokens.access,
        refresh: tokens.refresh,
        user: transformedUser,
      };
    } catch (profileError) {
      console.error("[Auth API] Profile fetch error:", profileError);

      // 4. Essayer un autre endpoint (/api/v1/utilisateurs/me/)
      try {
        const userMeResponse = await apiClient.get<ApiUserResponse>("/api/v1/utilisateurs/me/", {
          headers: {
            Authorization: "Bearer " + tokens.access,
          },
        });
        console.log("[Auth API] User me response:", userMeResponse.data);
        const transformedUser = transformApiUser(userMeResponse.data);
        return {
          access: tokens.access,
          refresh: tokens.refresh,
          user: transformedUser,
        };
      } catch (userMeError) {
        console.error("[Auth API] User me fetch error:", userMeError);

        // 5. Fallback: créer un utilisateur par défaut avec le rôle admin
        console.warn("[Auth API] Using fallback user with SUPER_ADMIN role");
        const fallbackUser: User = {
          id: 1,
          email: credentials.username,
          nom: "Administrateur",
          prenom: "NSIA",
          role: "SUPER_ADMIN",
          banque: {
            id: 1,
            code: "NSIA",
            nom: "NSIA Vie Assurances",
            produits_disponibles: [],
          },
          is_active: true,
        };
        return {
          access: tokens.access,
          refresh: tokens.refresh,
          user: fallbackUser,
        };
      }
    }
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    if (USE_MOCK_DATA) {
      return mockAuthApi.refreshToken(refresh);
    }
    const response = await apiClient.post<{ access: string }>("/api/v1/token/refresh/", {
      refresh,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockAuthApi.logout();
    }
    try {
      await apiClient.post("/api/v1/auth/logout/");
    } catch (e) {
      // Ignorer les erreurs de logout
    }
  },
};
