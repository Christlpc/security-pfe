import { delay, mockBanques } from "./data";
import type { Banque, PaginatedResponse } from "@/types";
import type { BanqueCreateData, BanqueUpdateData } from "@/lib/api/banques";

// Variable pour stocker les banques (incluant les nouvelles créées)
const banquesList = [...mockBanques];

export const mockBanqueApi = {
  getBanques: async (): Promise<PaginatedResponse<Banque>> => {
    await delay(400);
    return {
      count: banquesList.length,
      next: null,
      previous: null,
      results: banquesList,
    };
  },

  getBanque: async (id: number | string): Promise<Banque> => {
    await delay(300);
    const banque = banquesList.find((b) => String(b.id) === String(id));
    if (!banque) {
      throw new Error("Banque introuvable");
    }
    return banque;
  },

  createBanque: async (data: BanqueCreateData): Promise<Banque> => {
    await delay(500);

    // Vérifier si le code existe déjà
    const codeExists = banquesList.some((b) => b.code.toLowerCase() === data.code.toLowerCase());
    if (codeExists) {
      throw new Error("Une banque avec ce code existe déjà");
    }

    // Générer un nouvel ID (UUID simulé)
    const newId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newBanque: Banque = {
      id: newId,
      nom: data.nom,
      code: data.code.toUpperCase(),
      email: data.email,
      telephone: data.telephone,
      adresse: data.adresse,
      produits_disponibles: data.produits_disponibles as any,
      date_partenariat: data.date_partenariat,
      nombre_simulations: 0,
    };

    banquesList.push(newBanque);
    return newBanque;
  },

  updateBanque: async (id: number | string, data: BanqueUpdateData): Promise<Banque> => {
    await delay(500);

    const banqueIndex = banquesList.findIndex((b) => String(b.id) === String(id));
    if (banqueIndex === -1) {
      throw new Error("Banque introuvable");
    }

    const existingBanque = banquesList[banqueIndex];

    // Vérifier si le code existe déjà (si modifié)
    if (data.code && data.code !== existingBanque.code) {
      const codeExists = banquesList.some(
        (b) => String(b.id) !== String(id) && b.code.toLowerCase() === data.code!.toLowerCase()
      );
      if (codeExists) {
        throw new Error("Une banque avec ce code existe déjà");
      }
    }

    const updatedBanque: Banque = {
      ...existingBanque,
      nom: data.nom ?? existingBanque.nom,
      code: data.code ? data.code.toUpperCase() : existingBanque.code,
      email: data.email !== undefined ? data.email : existingBanque.email,
      telephone: data.telephone !== undefined ? data.telephone : existingBanque.telephone,
      adresse: data.adresse !== undefined ? data.adresse : existingBanque.adresse,
      produits_disponibles: (data.produits_disponibles as any) ?? existingBanque.produits_disponibles,
      date_partenariat: data.date_partenariat !== undefined ? data.date_partenariat : existingBanque.date_partenariat,
    };

    banquesList[banqueIndex] = updatedBanque;
    return updatedBanque;
  },

  deleteBanque: async (id: number | string): Promise<void> => {
    await delay(400);
    const banqueIndex = banquesList.findIndex((b) => String(b.id) === String(id));
    if (banqueIndex === -1) {
      throw new Error("Banque introuvable");
    }
    banquesList.splice(banqueIndex, 1);
  },
};
