import { delay } from "./data";
import type { Agence, PaginatedResponse } from "@/types";
import type { AgenceCreateData, AgenceUpdateData } from "@/lib/api/agences";

// Mock initial list of agencies
export const mockAgences: Agence[] = [
  // Ecobank Congo (ID: 2)
  {
    id: "1",
    banque: "2",
    banque_nom: "Ecobank Congo",
    code: "ECO-CTR",
    nom: "Ecobank Centre-ville",
    ville: "Brazzaville",
    adresse: "Avenue Amilcar Cabral, Centre-ville",
    telephone: "+242 05 555 1212",
    email: "centre-ville@ecobank.cg",
    active: true,
    date_creation: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    banque: "2",
    banque_nom: "Ecobank Congo",
    code: "ECO-PNR",
    nom: "Ecobank Pointe-Noire Principale",
    ville: "Pointe-Noire",
    adresse: "Avenue de l'Indépendance",
    telephone: "+242 05 555 1313",
    email: "pnr-principale@ecobank.cg",
    active: true,
    date_creation: "2024-01-20T11:00:00Z",
  },
  {
    id: "3",
    banque: "2",
    banque_nom: "Ecobank Congo",
    code: "ECO-ONZ",
    nom: "Ecobank Ouenzé",
    ville: "Brazzaville",
    adresse: "Rond-point des Trois Francs",
    telephone: "+242 06 666 1414",
    email: "ouenze@ecobank.cg",
    active: false,
    date_creation: "2024-02-05T09:30:00Z",
  },

  // Credit du Congo (ID: 3)
  {
    id: "4",
    banque: "3",
    banque_nom: "Crédit du Congo",
    code: "CDC-PRC",
    nom: "Crédit du Congo Principale",
    ville: "Brazzaville",
    adresse: "Avenue Nelson Mandela",
    telephone: "+242 05 444 2222",
    email: "principale@creditducongo.cg",
    active: true,
    date_creation: "2024-01-10T08:00:00Z",
  },
  {
    id: "5",
    banque: "3",
    banque_nom: "Crédit du Congo",
    code: "CDC-PLT",
    nom: "Crédit du Congo Plateau",
    ville: "Brazzaville",
    adresse: "Quartier Plateau",
    telephone: "+242 06 444 3333",
    email: "plateau@creditducongo.cg",
    active: true,
    date_creation: "2024-03-12T14:20:00Z",
  },

  // BGFI Bank (ID: 4)
  {
    id: "6",
    banque: "4",
    banque_nom: "BGFI Bank",
    code: "BGF-BCH",
    nom: "BGFI Beach",
    ville: "Brazzaville",
    adresse: "Port de Brazzaville, Beach",
    telephone: "+242 05 333 4444",
    email: "beach@bgfi.cg",
    active: true,
    date_creation: "2024-02-18T10:15:00Z",
  },
  {
    id: "7",
    banque: "4",
    banque_nom: "BGFI Bank",
    code: "BGF-MPL",
    nom: "BGFI Mpila",
    ville: "Brazzaville",
    adresse: "Avenue de l'OAU, Mpila",
    telephone: "+242 06 333 5555",
    email: "mpila@bgfi.cg",
    active: true,
    date_creation: "2024-02-22T16:45:00Z",
  },

  // BCI (ID: 5)
  {
    id: "8",
    banque: "5",
    banque_nom: "BCI",
    code: "BCI-RPT",
    nom: "BCI Rond-Point",
    ville: "Pointe-Noire",
    adresse: "Rond-Point Loandjili",
    telephone: "+242 05 222 7777",
    email: "loandjili@bci.cg",
    active: true,
    date_creation: "2024-03-01T09:00:00Z",
  },
  {
    id: "9",
    banque: "5",
    banque_nom: "BCI",
    code: "BCI-MKL",
    nom: "BCI Makelekele",
    ville: "Brazzaville",
    adresse: "Avenue de la Paix, Makelekele",
    telephone: "+242 06 222 8888",
    email: "makelekele@bci.cg",
    active: true,
    date_creation: "2024-03-10T11:30:00Z",
  }
];

let localAgencesList = [...mockAgences];

export const mockAgenceApi = {
  getAgences: async (params?: {
    search?: string;
    banque?: string;
    active?: boolean;
  }): Promise<PaginatedResponse<Agence>> => {
    await delay(300);
    let filtered = [...localAgencesList];

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.nom.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.ville.toLowerCase().includes(q)
      );
    }

    if (params?.banque) {
      filtered = filtered.filter((a) => String(a.banque) === String(params.banque));
    }

    if (params?.active !== undefined) {
      filtered = filtered.filter((a) => a.active === params.active);
    }

    return {
      count: filtered.length,
      next: null,
      previous: null,
      results: filtered,
    };
  },

  getAgence: async (id: string): Promise<Agence> => {
    await delay(200);
    const agence = localAgencesList.find((a) => String(a.id) === String(id));
    if (!agence) {
      throw new Error("Agence introuvable");
    }
    return agence;
  },

  createAgence: async (data: AgenceCreateData): Promise<Agence> => {
    await delay(400);
    const newId = `mock-ag-${Date.now()}`;
    const newAgence: Agence = {
      id: newId,
      banque: data.banque,
      code: data.code.toUpperCase(),
      nom: data.nom,
      ville: data.ville,
      adresse: data.adresse,
      telephone: data.telephone,
      email: data.email,
      active: data.active ?? true,
      date_creation: new Date().toISOString(),
    };

    localAgencesList.unshift(newAgence);
    return newAgence;
  },

  updateAgence: async (id: string, data: AgenceUpdateData): Promise<Agence> => {
    await delay(400);
    const index = localAgencesList.findIndex((a) => String(a.id) === String(id));
    if (index === -1) {
      throw new Error("Agence introuvable");
    }

    const existing = localAgencesList[index];
    const updated: Agence = {
      ...existing,
      banque: data.banque ?? existing.banque,
      code: data.code ? data.code.toUpperCase() : existing.code,
      nom: data.nom ?? existing.nom,
      ville: data.ville ?? existing.ville,
      adresse: data.adresse ?? existing.adresse,
      telephone: data.telephone ?? existing.telephone,
      email: data.email ?? existing.email,
      active: data.active ?? existing.active,
    };

    localAgencesList[index] = updated;
    return updated;
  },

  deleteAgence: async (id: string): Promise<void> => {
    await delay(300);
    const index = localAgencesList.findIndex((a) => String(a.id) === String(id));
    if (index === -1) {
      throw new Error("Agence introuvable");
    }
    localAgencesList.splice(index, 1);
  },
};
