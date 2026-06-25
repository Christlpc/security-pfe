import { apiClient } from "./client";
import { USE_MOCK_DATA } from "@/lib/utils/config";
import { mockBanqueApi } from "@/lib/mock/banques";
import { cleanPayload } from "@/lib/utils/payload";
import type { Banque, PaginatedResponse, ProduitType } from "@/types";

export interface BanqueCreateData {
  nom: string; // nom_complet
  code: string; // code_banque
  nom_court?: string;
  email?: string; // email_contact
  telephone?: string; // telephone_contact
  adresse?: string;
  logo?: File | string; // Logo de la banque (fichier ou URL)
  couleur_primaire?: string;
  couleur_secondaire?: string;
  police_principale?: string;
  statut?: string;
  produits_disponibles?: string[];
  date_partenariat?: string;
  parametres_specifiques?: Record<string, any>;
}

export interface BanqueUpdateData {
  nom?: string;
  code?: string;
  nom_court?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  logo?: File | string;
  couleur_primaire?: string;
  couleur_secondaire?: string;
  police_principale?: string;
  statut?: string;
  produits_disponibles?: string[];
  date_partenariat?: string;
  parametres_specifiques?: Record<string, any>;
}

// Interface pour la réponse brute de l'API
interface ApiBanque {
  id: string | number;
  code_banque?: string;
  code?: string;
  nom_complet?: string;
  nom_court?: string;
  nom?: string;
  email?: string;
  email_contact?: string;  // Champ API
  telephone?: string;
  telephone_contact?: string;  // Champ API
  adresse?: string;
  produits_disponibles?: string[];
  produits?: string[]; // Alternative field name
  products?: string[]; // English alternative
  date_partenariat?: string;
  // UI fields that might be at root or in params
  logo?: string;
  couleur_primaire?: string;
  couleur_secondaire?: string;
  police_principale?: string;
  statut?: string;
  parametres_specifiques?: Record<string, any>;
}

// Transformer une banque API vers le format frontend
function transformApiBanque(apiBanque: ApiBanque): Banque {
  // Debug: voir les données brutes
  console.log("[Banques API] Raw banque data:", JSON.stringify(apiBanque, null, 2));

  // Récupérer les produits depuis parametres_specifiques (source de vérité) ou les champs racine (fallback)
  let produits = apiBanque.produits_disponibles || apiBanque.produits || apiBanque.products || [];

  // Si pas trouvé à la racine, on regarde dans parametres_specifiques
  const params = apiBanque.parametres_specifiques as Record<string, any> | undefined;

  if ((!produits || produits.length === 0) && params && Array.isArray(params.produits_disponibles)) {
    produits = params.produits_disponibles;
  }

  console.log("[Banques API] Produits found:", produits);

  return {
    id: apiBanque.id, // Garder l'UUID comme string
    code: apiBanque.code_banque || apiBanque.code || "",
    nom: apiBanque.nom_complet || apiBanque.nom_court || apiBanque.nom || "",
    email: apiBanque.email_contact || apiBanque.email,
    telephone: apiBanque.telephone_contact || apiBanque.telephone,
    adresse: apiBanque.adresse,
    // Fallback aux paramètres spécifiques pour les couleurs et le logo
    couleur_primaire: apiBanque.couleur_primaire || params?.couleur_primaire,
    couleur_secondaire: apiBanque.couleur_secondaire || params?.couleur_secondaire,
    logo: apiBanque.logo || params?.logo || params?.logo_base64, // URL ou Base64
    police_principale: apiBanque.police_principale || params?.police_principale,
    statut: apiBanque.statut || params?.statut,
    est_active: ["actif", "active", "enabled", "true", "1"].includes(String(apiBanque.statut || params?.statut || "").toLowerCase()),

    produits_disponibles: produits as ProduitType[],
    date_partenariat: apiBanque.date_partenariat,
    parametres_specifiques: apiBanque.parametres_specifiques,
  };
}

// Transformer une liste paginée de banques
function transformPaginatedBanques(response: PaginatedResponse<ApiBanque>): PaginatedResponse<Banque> {
  return {
    ...response,
    results: response.results.map(transformApiBanque),
  };
}

// Transformer un tableau de banques (si non paginé)
function transformBanquesArray(banques: ApiBanque[]): Banque[] {
  return banques.map(transformApiBanque);
}

export const banqueApi = {
  getBanques: async (): Promise<PaginatedResponse<Banque>> => {
    if (USE_MOCK_DATA) {
      return mockBanqueApi.getBanques();
    }
    try {
      // Ajouter page_size=1000 pour récupérer toutes les banques
      const response = await apiClient.get<PaginatedResponse<ApiBanque> | ApiBanque[]>("/api/v1/banques/", {
        params: { page_size: 1000 }
      });
      // Gérer le cas où l'API retourne un tableau ou une réponse paginée
      if (Array.isArray(response.data)) {
        return {
          count: response.data.length,
          next: null,
          previous: null,
          results: transformBanquesArray(response.data),
        };
      }
      return transformPaginatedBanques(response.data);
    } catch (error) {
      console.error("[Banques API] Error fetching banques:", error);
      throw error;
    }
  },

  getBanque: async (id: number | string): Promise<Banque> => {
    if (USE_MOCK_DATA) {
      return mockBanqueApi.getBanque(id);
    }
    const response = await apiClient.get<ApiBanque>(`/api/v1/banques/${id}/`);
    return transformApiBanque(response.data);
  },

  createBanque: async (data: BanqueCreateData): Promise<Banque> => {
    if (USE_MOCK_DATA) {
      return mockBanqueApi.createBanque(data);
    }

    // Préparer les paramètres spécifiques avec les produits
    const params = data.parametres_specifiques || {};
    if (data.produits_disponibles) {
      params.produits_disponibles = data.produits_disponibles;
    }
    // Persister aussi les couleurs et le style dans les paramètres (fallback)
    if (data.couleur_primaire) params.couleur_primaire = data.couleur_primaire;
    if (data.couleur_secondaire) params.couleur_secondaire = data.couleur_secondaire;
    if (data.police_principale) params.police_principale = data.police_principale;
    if (data.statut) params.statut = data.statut;

    // Si un fichier logo est fourni, le convertir en base64 et stocker dans parametres_specifiques
    // Le backend ne supporte pas l'upload de fichiers, on utilise base64 comme workaround
    if (data.logo instanceof File) {
      try {
        const base64Logo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(data.logo as File);
        });
        params.logo_base64 = base64Logo;
        console.log("[Banques API] Logo converted to base64, length:", base64Logo.length);
      } catch (error) {
        console.error("[Banques API] Failed to convert logo to base64:", error);
      }
    } else if (typeof data.logo === 'string' && data.logo) {
      // Si c'est déjà une URL ou base64, le stocker directement
      params.logo_base64 = data.logo;
    }

    // Sinon, utiliser JSON classique
    const apiData = {
      code_banque: data.code,
      nom_complet: data.nom,
      nom_court: data.nom_court || data.code,
      email_contact: data.email,
      telephone_contact: data.telephone || "+242 00 000 00 00",
      adresse: data.adresse || "À définir",
      couleur_primaire: data.couleur_primaire || "#003366",
      couleur_secondaire: data.couleur_secondaire || "#FFD700",
      police_principale: data.police_principale || "Arial",
      statut: data.statut || "ACTIF",
      date_partenariat: data.date_partenariat || null,
      parametres_specifiques: params, // Inclut les produits
    };

    console.log("[Banques API] Creating banque with payload:", JSON.stringify(apiData, null, 2));

    try {
      const response = await apiClient.post<ApiBanque>("/api/v1/banques/", apiData);
      console.log("[Banques API] Banque created successfully:", response.data);
      return transformApiBanque(response.data);
    } catch (error: any) {
      console.error("[Banques API] Error creating banque:", error.response?.data || error.message);
      throw error;
    }
  },

  updateBanque: async (id: number | string, data: BanqueUpdateData): Promise<Banque> => {
    if (USE_MOCK_DATA) {
      return mockBanqueApi.updateBanque(id, data);
    }
    // Adapter les données pour l'API
    const apiData: Record<string, any> = {};
    if (data.code !== undefined) apiData.code_banque = data.code;
    if (data.nom !== undefined) apiData.nom_complet = data.nom;
    if (data.email !== undefined) apiData.email_contact = data.email;
    if (data.telephone !== undefined) apiData.telephone_contact = data.telephone;
    if (data.adresse !== undefined) apiData.adresse = data.adresse;
    if (data.date_partenariat !== undefined) apiData.date_partenariat = data.date_partenariat;

    // Gérer parametres_specifiques pour produits et couleurs
    if (data.parametres_specifiques || data.produits_disponibles || data.couleur_primaire || data.couleur_secondaire) {
      // Il faudrait idéalement récupérer l'existant, mais pour l'instant on merge ce qu'on a
      const params = data.parametres_specifiques || {};

      if (data.produits_disponibles) params.produits_disponibles = data.produits_disponibles;
      if (data.couleur_primaire) params.couleur_primaire = data.couleur_primaire;
      if (data.couleur_secondaire) params.couleur_secondaire = data.couleur_secondaire;
      if (data.police_principale) params.police_principale = data.police_principale;
      if (data.statut) params.statut = data.statut;

      apiData.parametres_specifiques = params;
    }

    const cleanedData = cleanPayload(apiData);
    const response = await apiClient.patch<ApiBanque>(`/api/v1/banques/${id}/`, cleanedData);
    return transformApiBanque(response.data);
  },

  /**
   * Récupère les produits disponibles d'une banque
   * Note: Sur l'API Live, produits stockés dans parametres_specifiques
   */
  getBanqueProduits: async (id: number | string): Promise<string[]> => {
    if (USE_MOCK_DATA) {
      return ["emprunteur", "confort_retraite", "confort_etudes", "elikia_scolaire", "mobateli", "epargne_plus"];
    }
    try {
      // L'endpoint /produits/ n'existe pas sur le backend live actuel.
      // On récupère la banque entière et on lit dans parametres_specifiques
      const response = await apiClient.get<ApiBanque>(`/api/v1/banques/${id}/`);
      const apiBanque = response.data;

      let produits = apiBanque.produits_disponibles || apiBanque.produits || apiBanque.products || [];
      const params = apiBanque.parametres_specifiques as Record<string, any> | undefined;

      if ((!produits || produits.length === 0) && params && Array.isArray(params.produits_disponibles)) {
        produits = params.produits_disponibles;
      }

      return produits || [];
    } catch (error) {
      console.error("[Banques API] Error fetching banque produits:", error);
      return [];
    }
  },

  getBanqueUtilisateurs: async (id: number | string): Promise<import("@/types").User[]> => {
    if (USE_MOCK_DATA) {
      const { mockUserApi } = await import("@/lib/mock/users");
      const banqueId = typeof id === "string" ? Number(id) : id;
      const usersResponse = await mockUserApi.getUsers({ banque: banqueId });
      return usersResponse.results;
    }
    const response = await apiClient.get<import("@/types").User[]>(
      `/api/v1/banques/${id}/utilisateurs/`
    );
    return response.data;
  },

  deleteBanque: async (id: number | string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockBanqueApi.deleteBanque(id);
    }
    await apiClient.delete(`/api/v1/banques/${id}/`);
  },
};
