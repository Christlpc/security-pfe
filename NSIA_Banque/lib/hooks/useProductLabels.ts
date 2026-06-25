"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getProductLabel, getAllProductLabels } from "@/lib/utils/productLabels";
import { ProduitType, PRODUIT_LABELS } from "@/types";

/**
 * Hook pour obtenir les labels de produits spécifiques à la banque de l'utilisateur connecté
 * @returns Objet contenant les fonctions pour obtenir les labels
 */
export function useProductLabels() {
    const { user } = useAuthStore();

    // Récupérer le code banque de l'utilisateur connecté
    const banqueCode = useMemo(() => {
        if (user?.banque && typeof user.banque === "object") {
            return user.banque.code || null;
        }
        return null;
    }, [user?.banque]);

    // Fonction pour obtenir un label de produit spécifique
    const getLabel = useMemo(
        () => (produit: ProduitType | string) => getProductLabel(produit, banqueCode),
        [banqueCode]
    );

    // Tous les labels avec les personnalisations de la banque
    const allLabels = useMemo(
        () => getAllProductLabels(banqueCode),
        [banqueCode]
    );

    return {
        getLabel,
        allLabels,
        banqueCode,
        // Exporter aussi les labels par défaut pour la comparaison
        defaultLabels: PRODUIT_LABELS,
    };
}
