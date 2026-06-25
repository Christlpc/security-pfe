import { z } from 'zod';
import { BaseProductSchema } from '@/src/domain/products/base/Product';

export const EmprunteurFormSchema = BaseProductSchema.extend({
    // ── Informations du prêt ─────────────────────────────────
    montant_pret: z.coerce.number().min(1, "Le montant du prêt est requis"),
    duree_mois: z.coerce.number().min(1, "La durée en mois est requise"),
    taux_interet: z.coerce.number().min(0, "Le taux d'intérêt est requis"),
    duree_differe: z.coerce.number().min(0).default(0),
    taux_tps: z.coerce.number().min(0).optional(),
    type_pret: z.string().optional(),
    numero_convention: z.string().optional(),

    // ── Qualité de l'assuré ──────────────────────────────────
    qualite_assure: z.enum(['emprunteur', 'co_emprunteur', 'caution', 'autre']).default('emprunteur'),

    // ── Dates ────────────────────────────────────────────────
    date_octroi: z.string().optional(),
    date_effet: z.string().optional(),
    date_premiere_echeance: z.string().optional(),

    // ── Périodicité remboursement (aligné BIA) ───────────────
    periodicite_remboursement: z.enum(['mensuel', 'trimestriel', 'semestriel', 'annuel']).default('mensuel'),
    origine_des_fonds: z.string().optional(),

    // ── Contrat NSIA existant ────────────────────────────────
    deja_souscrit_nsia: z.boolean().default(false),
    details_contrat_nsia: z.string().optional(),

    // ── Bénéficiaires (la banque par défaut) ─────────────────
    beneficiaires: z.array(z.any()).optional(),
}).passthrough();

export type EmprunteurFormData = z.infer<typeof EmprunteurFormSchema>;

export interface EmprunteurPayload {
    banque: string | number;

    // Client (assuré)
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    cellulaire: string;
    titre_assure: string;
    date_naissance: string;
    lieu_naissance: string;
    nationalite: string;
    type_piece_identite: string;
    numero_piece_identite: string;
    adresse_postale: string;
    adresse_geographique: string;
    profession: string;
    employeur: string;
    poste: string;
    adresse_employeur: string;
    telephone_employeur: string;
    telephone_domicile: string;
    telephone_bureau: string;
    situation_matrimoniale: string;
    numero_compte: string;

    // Correspondant
    correspondant_nom: string;
    correspondant_prenom: string;
    correspondant_adresse: string;
    correspondant_telephone: string;
    correspondant_cellulaire: string;

    // Qualité assuré
    qualite_assure: string;

    // Prêt
    montant_pret: number;
    duree_mois: number;
    duree_differe: number;
    taux_interet: number;
    taux_tps: number;
    type_pret: string;
    numero_convention: string;
    periodicite_remboursement: string;
    origine_des_fonds: string;

    // Dates
    date_octroi: string;
    date_effet: string;
    date_premiere_echeance: string;

    // NSIA existant
    deja_souscrit_nsia: boolean;
    details_contrat_nsia: string;

    // Meta
    avec_details: boolean;
    sauvegarder: boolean;
    beneficiaires: any[];
}
