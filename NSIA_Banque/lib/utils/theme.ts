import type { Banque } from "@/types";

export interface BankTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  logo?: string;
  name: string;
  // Raw color values for inline styles (hex)
  primaryColor: string;
  secondaryColor: string;
}

// Thèmes par banque
export const bankThemes: Record<string, BankTheme> = {
  NSIA: {
    primary: "from-[#0B192C] to-[#1E3E62]",
    secondary: "bg-[#0B192C]/5",
    accent: "text-[#1E3E62]",
    gradient: "bg-gradient-to-br from-[#0B192C] to-[#1E3E62]",
    name: "NSIA Vie Assurances",
    primaryColor: "#0B192C",
    secondaryColor: "#1E3E62",
  },
  ECO: {
    primary: "from-green-600 to-emerald-700",
    secondary: "bg-green-50",
    accent: "text-green-600",
    gradient: "bg-gradient-to-br from-green-600 to-emerald-700",
    name: "Ecobank Congo",
    primaryColor: "#16a34a",
    secondaryColor: "#047857",
  },
  CDCO: {
    primary: "from-purple-600 to-pink-700",
    secondary: "bg-purple-50",
    accent: "text-purple-600",
    gradient: "bg-gradient-to-br from-purple-600 to-pink-700",
    name: "Crédit du Congo",
    primaryColor: "#9333ea",
    secondaryColor: "#be185d",
  },
  BGFI: {
    primary: "from-orange-600 to-red-700",
    secondary: "bg-orange-50",
    accent: "text-orange-600",
    gradient: "bg-gradient-to-br from-orange-600 to-red-700",
    name: "BGFI",
    primaryColor: "#ea580c",
    secondaryColor: "#b91c1c",
  },
  BCI: {
    primary: "from-cyan-600 to-blue-700",
    secondary: "bg-cyan-50",
    accent: "text-cyan-600",
    gradient: "bg-gradient-to-br from-cyan-600 to-blue-700",
    name: "BCI",
    primaryColor: "#0891b2",
    secondaryColor: "#1d4ed8",
  },
  CHF: {
    primary: "from-teal-600 to-green-700",
    secondary: "bg-teal-50",
    accent: "text-teal-600",
    gradient: "bg-gradient-to-br from-teal-600 to-green-700",
    name: "Charden Farell",
    primaryColor: "#0d9488",
    secondaryColor: "#15803d",
  },
  HOPE: {
    primary: "from-rose-600 to-pink-700",
    secondary: "bg-rose-50",
    accent: "text-rose-600",
    gradient: "bg-gradient-to-br from-rose-600 to-pink-700",
    name: "Hope Congo",
    primaryColor: "#e11d48",
    secondaryColor: "#be185d",
  },
  COMIFI: {
    primary: "from-yellow-600 to-amber-700",
    secondary: "bg-yellow-50",
    accent: "text-yellow-600",
    gradient: "bg-gradient-to-br from-yellow-600 to-amber-700",
    name: "COMIFI",
    primaryColor: "#ca8a04",
    secondaryColor: "#b45309",
  },
  CAPPED: {
    primary: "from-slate-600 to-zinc-700",
    secondary: "bg-slate-50",
    accent: "text-slate-600",
    gradient: "bg-gradient-to-br from-slate-600 to-zinc-700",
    name: "CAPPED",
    primaryColor: "#475569",
    secondaryColor: "#27272a",
  },
};

export function getBankTheme(banque: Banque | null | undefined): BankTheme {
  if (!banque) {
    return bankThemes.NSIA;
  }

  // Si la banque a des couleurs personnalisées
  if (banque.couleur_primaire) {
    const primary = banque.couleur_primaire;
    const secondary = banque.couleur_secondaire || primary;

    return {
      primary: `from-[${primary}] to-[${secondary}]`,
      secondary: `bg-[${primary}]/10`, // 10% opacity for backgrounds
      accent: `text-[${primary}]`,
      gradient: `bg-gradient-to-br from-[${primary}] to-[${secondary}]`,
      name: banque.nom || banque.code,
      primaryColor: primary,
      secondaryColor: secondary,
    };
  }

  return bankThemes[banque.code] || bankThemes.NSIA;
}

export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: "Super Administrateur",
    ADMIN: "Administrateur",
    ADMIN_NSIA: "Administrateur",
    RESPONSABLE_BANQUE: "Responsable Banque",
    GESTIONNAIRE: "Gestionnaire",
    SUPPORT: "Support",
  };
  return roleNames[role] || role;
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-800",
    ADMIN: "bg-blue-100 text-blue-800",
    ADMIN_NSIA: "bg-blue-100 text-blue-800",
    RESPONSABLE_BANQUE: "bg-green-100 text-green-800",
    GESTIONNAIRE: "bg-yellow-100 text-yellow-800",
    SUPPORT: "bg-gray-100 text-gray-800",
  };
  return colors[role] || "bg-gray-100 text-gray-800";
}
