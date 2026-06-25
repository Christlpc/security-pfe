import { RetraitePayload } from "../products/confort-retraite/ConfortRetraiteSchema";
import { ElikiaPayload } from "../products/elikia-scolaire/ElikiaSchema";
import { MobateliPayload } from "../products/mobateli/MobateliSchema";
import { EmprunteurPayload } from "../products/emprunteur/EmprunteurSchema";
import { EpargnePlusPayload } from "../products/epargne-plus/EpargnePlusProduct";

export type ProductType =
    | "confort_retraite"
    | "elikia_scolaire"
    | "mobateli"
    | "emprunteur"
    | "epargne_plus"
    | "confort_etudes";

export interface BaseSimulationResponse {
    id: string;
    reference: string;
    statut: "brouillon" | "calculee" | "validee" | "proposition" | "convertie";
    created_at: string;
    updated_at: string;
    created_by: number;

    // Technical fields
    donnees_entree?: Record<string, any>;
    resultats_calcul?: Record<string, any>;
}

// Discriminated Union based on 'produit'
export type SimulationResponse = BaseSimulationResponse & (
    | ({ produit: "confort_retraite" } & RetraitePayload)
    | ({ produit: "elikia_scolaire" } & ElikiaPayload)
    | ({ produit: "mobateli" } & MobateliPayload)
    | ({ produit: "emprunteur" } & EmprunteurPayload)
    | ({ produit: "epargne_plus" } & EpargnePlusPayload)
    | ({ produit: "confort_etudes" } & any) // Placeholder for now
);
