import { ProduitType, PRODUIT_LABELS } from "@/types";

/**
 * Mapping de normalisation pour les clés de produits
 * Gère les variantes de casse, d'espaces et les suffixes (DTC/IAD, etc.)
 */
const PRODUCT_NORMALIZATION_MAP: Record<string, ProduitType> = {
    'elikia': 'elikia_scolaire',
    'elikia scolaire': 'elikia_scolaire',
    'mobateli': 'mobateli',
    'mobateli (dtc/iad)': 'mobateli',
    'etudes': 'confort_etudes',
    'confort etudes': 'confort_etudes',
    'retraite': 'confort_retraite',
    'confort retraite': 'confort_retraite',
    'epargne': 'epargne_plus',
    'epargne plus': 'epargne_plus',
    'emprunteur': 'emprunteur',
    'emprunteur (adi)': 'emprunteur',
};

/**
 * Normalise une clé de produit vers un type ProduitType valide
 */
export function normalizeProductKey(produit: string | undefined | null): ProduitType | null {
    if (!produit) return null;
    const lower = produit.toLowerCase().trim();

    // 1. Vérifie si c'est déjà une clé valide
    if (Object.keys(PRODUIT_LABELS).includes(lower)) {
        return lower as ProduitType;
    }

    // 2. Vérifie le mapping de normalisation
    return PRODUCT_NORMALIZATION_MAP[lower] || null;
}

/**
 * Mapping des noms de produits spécifiques par banque
 * Clé: code banque, Valeur: mapping produit -> label personnalisé
 */
const BANK_SPECIFIC_PRODUCT_LABELS: Record<string, Partial<Record<ProduitType, string>>> = {
    // BOA: Mobateli est appelé "LIKAMA"
    BOA: {
        mobateli: "LIKAMA",
        epargne_plus: "BWANIA",
    },
    // BCI: Elikia est appelé "KELASSI"
    BCI: {
        elikia_scolaire: "KELASSI",
    },
};

/**
 * Récupère le label d'un produit en fonction de la banque
 * @param produit - Le type de produit
 * @param banqueCode - Le code de la banque (optionnel)
 * @returns Le label du produit (personnalisé pour la banque ou par défaut)
 */
export function getProductLabel(produit: ProduitType | string, banqueCode?: string | null): string {
    // Normalisation préalable pour être sûr d'avoir une clé propre
    const normalizedKey = normalizeProductKey(produit as string);
    const produitKey = normalizedKey || (produit as ProduitType);

    // Si un code banque est fourni, vérifier s'il y a un label personnalisé
    if (banqueCode && produitKey) {
        // Validation stricte du type pour l'accès indexé, bien que normalizeProductKey garantisse ProduitType si non null
        const castedKey = produitKey as ProduitType;
        const bankLabels = BANK_SPECIFIC_PRODUCT_LABELS[banqueCode.toUpperCase()];
        if (bankLabels && bankLabels[castedKey]) {
            return bankLabels[castedKey] as string;
        }
    }

    // Retourner le label par défaut
    // Si produitKey est une clé valide, on retourne son label.
    // Sinon on retourne la chaîne d'origine.
    if (normalizedKey) {
        return PRODUIT_LABELS[normalizedKey];
    }

    // Fallback safe
    return PRODUIT_LABELS[produitKey as ProduitType] || (produit as string) || "";
}

/**
 * Récupère tous les labels de produits pour une banque spécifique
 * @param banqueCode - Le code de la banque (optionnel)
 * @returns Un objet avec tous les labels (personnalisés ou par défaut)
 */
export function getAllProductLabels(banqueCode?: string | null): Record<ProduitType, string> {
    const labels = { ...PRODUIT_LABELS };

    if (banqueCode) {
        const bankLabels = BANK_SPECIFIC_PRODUCT_LABELS[banqueCode.toUpperCase()];
        if (bankLabels) {
            Object.assign(labels, bankLabels);
        }
    }

    return labels;
}

/**
 * Vérifie si une banque a des labels de produits personnalisés
 * @param banqueCode - Le code de la banque
 * @returns true si la banque a des labels personnalisés
 */
export function hasBankSpecificLabels(banqueCode: string): boolean {
    return !!BANK_SPECIFIC_PRODUCT_LABELS[banqueCode.toUpperCase()];
}
