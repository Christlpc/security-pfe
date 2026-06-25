import type { ProduitType } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://nsia-bancassurance.onrender.com";

export const ROLES = {
  SUPER_ADMIN_NSIA: "SUPER_ADMIN",
  ADMIN_NSIA: "ADMIN",
  RESPONSABLE_BANQUE: "RESPONSABLE_BANQUE",
  GESTIONNAIRE: "GESTIONNAIRE",
  SUPPORT: "SUPPORT",
} as const;

export const STATUTS = {
  BROUILLON: "brouillon",
  CALCULEE: "calculee",
  VALIDEE: "validee",
  CONVERTIE: "convertie",
} as const;

export const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  calculee: "Simulée",
  validee: "Proposition",
  convertie: "Contrat",
};

export const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-800",
  calculee: "bg-blue-100 text-blue-800",
  validee: "bg-green-100 text-green-800",
  convertie: "bg-purple-100 text-purple-800",
};

export const RISK_CATEGORIES = {
  FAIBLE: "faible",
  MOYEN: "moyen",
  ELEVE: "eleve",
  TRES_ELEVE: "tres_eleve",
} as const;

export const RISK_CATEGORY_LABELS: Record<string, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
  tres_eleve: "Très élevé",
};

export const RISK_CATEGORY_COLORS: Record<string, string> = {
  faible: "bg-green-100 text-green-800",
  moyen: "bg-yellow-100 text-yellow-800",
  eleve: "bg-orange-100 text-orange-800",
  tres_eleve: "bg-red-100 text-red-800",
};

// Tous les produits disponibles
export const ALL_PRODUITS: ProduitType[] = [
  "emprunteur",
  "confort_retraite",
  "confort_etudes",
  "elikia_scolaire",
  "mobateli",
  "epargne_plus",
];



