import { z } from 'zod';
import { BaseProductSchema } from '@/src/domain/products/base/Product';

/**
 * Schema Zod — Confort Retraite
 * Aligné sur le BIA physique NSIA et le serializer backend.
 */
export const RetraiteFormSchema = BaseProductSchema.extend({
    // ── II. COTISATION ─────────────────────────────────────────
    prime_periodique_commerciale: z.coerce.number().min(1000, "Minimum 1 000 FCFA"),
    periodicite: z.enum(['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'], {
        errorMap: () => ({ message: "Sélectionnez une périodicité" }),
    }),
    mode_paiement: z.enum(['prelevement_salaire', 'prelevement_bancaire', 'cheque'], {
        errorMap: () => ({ message: "Sélectionnez un mode de paiement" }),
    }).optional(),
    origine_des_fonds: z.string().optional(),

    // ── III. GARANTIES ─────────────────────────────────────────
    duree: z.coerce.number().min(1, "Durée requise").max(40),
    capital_deces: z.coerce.number().min(0).optional(),
    date_premiere_cotisation: z.string().optional(),

    // ── Souscripteur ≠ Assuré ──────────────────────────────────
    assure_est_souscripteur: z.boolean().optional(),
    souscripteur_civilite: z.string().optional(),
    souscripteur_nom: z.string().optional(),
    souscripteur_prenoms: z.string().optional(),
    souscripteur_date_naissance: z.string().optional(),
    souscripteur_lieu_naissance: z.string().optional(),
    souscripteur_adresse: z.string().optional(),
    souscripteur_telephone: z.string().optional(),
    souscripteur_profession: z.string().optional(),
    souscripteur_employeur: z.string().optional(),

    // ── NSIA existant ──────────────────────────────────────────
    deja_souscrit_nsia: z.boolean().optional(),
    details_contrat_nsia: z.string().optional(),

    // ── Bénéficiaires au terme ─────────────────────────────────
    beneficiaire_terme_assure: z.boolean().optional(),

    // ── Bénéficiaires en cas de décès ──────────────────────────
    beneficiaire_deces_conjoint: z.boolean().optional(),
    beneficiaire_deces_enfants: z.boolean().optional(),
    beneficiaire_deces_autres: z.boolean().optional(),
}).passthrough();

export type RetraiteFormData = z.infer<typeof RetraiteFormSchema>;

/**
 * Payload envoyé à l'API — aligné sur SimulateurRetraiteInputSerializer.
 */
export interface RetraitePayload {
    banque: string | number;

    // Cotisation
    prime_periodique_commerciale: number;
    periodicite: string;
    mode_paiement: string;
    origine_des_fonds: string;

    // Garanties
    duree: number;
    capital_deces: number;
    date_premiere_cotisation?: string;

    // Identité assuré (commun)
    nom: string;
    prenom: string;
    date_naissance: string;
    email: string;
    telephone: string;
    titre_assure: string;
    lieu_naissance: string;
    situation_matrimoniale: string;
    adresse_postale: string;
    adresse_geographique: string;
    cellulaire: string;
    telephone_domicile: string;
    telephone_bureau: string;
    profession: string;
    employeur: string;
    adresse_employeur: string;
    telephone_employeur: string;
    numero_compte: string;

    // Correspondant
    correspondant_nom: string;
    correspondant_telephone: string;
    correspondant_cellulaire: string;

    // Souscripteur
    assure_est_souscripteur: boolean;
    souscripteur?: Record<string, any>;

    // NSIA existant
    deja_souscrit_nsia: boolean;
    details_contrat_nsia: string;

    // Bénéficiaires
    beneficiaire_terme_assure: boolean;
    beneficiaires_terme?: any[];
    beneficiaire_deces_conjoint: boolean;
    beneficiaire_deces_enfants: boolean;
    beneficiaire_deces_autres: boolean;
    beneficiaires: any[];

    sauvegarder: boolean;
}
