import { z } from 'zod';
import { BaseProductSchema } from '@/src/domain/products/base/Product';

// Schéma conjoint
const ConjointSchema = z.object({
    civilite: z.string().optional(),
    nom: z.string().optional(),
    prenoms: z.string().optional(),
    date_naissance: z.string().optional(),
    lieu_naissance: z.string().optional(),
    mobile: z.string().optional(),
    telephone_domicile: z.string().optional(),
    telephone_bureau: z.string().optional(),
}).optional();

// Schéma enfant
const EnfantSchema = z.object({
    nom_prenoms: z.string().min(1, "Nom requis"),
    date_naissance: z.string().optional(),
});

export const MobateliFormSchema = BaseProductSchema.extend({
    // ── Mode de calcul ──────────────────────────────────────
    mode_calcul: z.enum(['forfaitaire', 'sur_mesure']).default('forfaitaire'),

    // ── Champs communs ──────────────────────────────────────
    capital_dtc_iad: z.any().optional(),
    option_frais_funeraires: z.enum(['aucune', 'option_1', 'option_2', 'option_3']).or(z.literal('')).optional(),

    // ── Champs Sur Mesure ───────────────────────────────────
    volet: z.enum(['dtc', 'dtc_ff']).optional(),
    // Volet DTC (prime → capital)
    prime_souhaitee: z.coerce.number().min(0).optional(),
    duree_sur_mesure: z.coerce.number().min(1).max(5).optional(),
    type_prime: z.enum(['annuelle', 'unique']).optional(),
    // Volet DTC+FF (capital → prime)
    capital_sur_mesure: z.coerce.number().min(0).optional(),
    date_souscription: z.string().optional(),

    // ── Convention ───────────────────────────────────────────
    numero_convention: z.string().optional(),
    duree_engagement: z.coerce.number().optional(),

    // ── Identification familiale ─────────────────────────────
    conjoint: ConjointSchema,
    enfants: z.array(EnfantSchema).optional(),

    // ── Souscripteur (si différent de l'assuré) ──────────────
    assure_est_souscripteur: z.boolean().default(true),
    souscripteur_civilite: z.string().optional(),
    souscripteur_nom: z.string().optional(),
    souscripteur_prenoms: z.string().optional(),
    souscripteur_date_naissance: z.string().optional(),
    souscripteur_lieu_naissance: z.string().optional(),
    souscripteur_adresse: z.string().optional(),
    souscripteur_telephone: z.string().optional(),
    souscripteur_profession: z.string().optional(),
    souscripteur_employeur: z.string().optional(),

    // ── Bénéficiaires prédéfinis ─────────────────────────────
    beneficiaire_deces_conjoint: z.boolean().default(false),
    beneficiaire_deces_enfants: z.boolean().default(false),
    beneficiaire_deces_autres: z.boolean().default(false),

    // ── Paiement (aligné BIA Mobateli) ───────────────────────
    mode_paiement: z.enum([
        'prelevement_bancaire',
        'prelevement_salaire',
        'especes',
        'cheque',
    ]).or(z.literal('')).optional(),
    type_cotisation: z.enum(['prime_unique', 'cotisations_annuelles']).or(z.literal('')).optional(),
    origine_des_fonds: z.string().optional(),

    // ── Dates ────────────────────────────────────────────────
    date_premiere_prime: z.string().optional(),
    date_effet: z.string().optional(),
    date_echeance: z.string().optional(),

    // ── Bénéficiaires décès (liste) ──────────────────────────
    beneficiaires: z.array(z.any()).optional(),

    // ── Famille (ancien format — rétrocompatibilité) ─────────
    famille: z.array(z.any()).optional(),
}).passthrough();

export type MobateliFormData = z.infer<typeof MobateliFormSchema>;

export interface MobateliPayload {
    banque: string | number;

    // Client (assuré)
    nom: string;
    prenom: string;
    titre_assure: string;
    date_naissance: string;
    lieu_naissance: string;
    nationalite: string;
    type_piece_identite: string;
    numero_piece_identite: string;
    situation_matrimoniale: string;
    profession: string;
    employeur: string;
    poste: string;
    email: string;
    telephone: string;
    cellulaire: string;
    telephone_domicile: string;
    telephone_bureau: string;
    adresse_postale: string;
    adresse_geographique: string;
    adresse_employeur: string;
    telephone_employeur: string;
    numero_compte: string;
    age: number;

    // Correspondant
    correspondant_nom: string;
    correspondant_prenom: string;
    correspondant_adresse: string;
    correspondant_telephone: string;
    correspondant_cellulaire: string;

    // Convention
    numero_convention: string;
    duree_engagement: number;
    duree_contrat: number;

    // Garanties
    capital_dtc_iad: number;
    montant_frais_funeraires: number;
    option_frais_funeraires: string;

    // Famille
    conjoint?: {
        civilite: string;
        nom: string;
        prenoms: string;
        date_naissance: string;
        lieu_naissance: string;
        mobile: string;
        telephone_domicile: string;
        telephone_bureau: string;
    };
    enfants: Array<{ nom_prenoms: string; date_naissance: string }>;

    // Souscripteur
    assure_est_souscripteur: boolean;
    souscripteur?: {
        civilite: string;
        nom: string;
        prenoms: string;
        date_naissance: string;
        lieu_naissance: string;
        adresse: string;
        telephone: string;
        profession: string;
        employeur: string;
    };

    // Bénéficiaires prédéfinis
    beneficiaires_predefinis: string[];

    // Paiement
    mode_paiement: string;
    type_cotisation: string;
    origine_des_fonds: string;
    date_premiere_prime: string;
    date_effet: string;
    date_echeance: string;

    // Bénéficiaires décès (liste)
    beneficiaires: any[];
    famille: any[];
    sauvegarder: boolean;
}

/** Payload spécifique au mode Sur Mesure */
export interface MobateliSurMesurePayload {
    volet: 'dtc' | 'dtc_ff';
    date_naissance: string;
    date_souscription?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    // Volet DTC
    prime?: number;
    duree?: number;
    type_prime?: 'annuelle' | 'unique';
    // Volet DTC+FF
    capital?: number;
    // Meta
    sauvegarder: boolean;
}
