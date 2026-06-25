import { z } from 'zod';
import { BaseProductSchema } from '@/src/domain/products/base/Product';

export const EtudesFormSchema = BaseProductSchema.extend({
    // ── Paramètres du contrat Études ─────────────────────────
    age_parent: z.coerce.number().optional(),
    age_enfant: z.coerce.number().min(0, "Âge enfant requis").max(25),
    montant_rente: z.coerce.number().min(0, "Montant rente requis"),
    duree_paiement: z.coerce.number().min(1, "Durée cotisation requise"),
    duree_service: z.coerce.number().min(3).max(5),

    // ── Périodicité & Paiement (aligné BIA) ──────────────────
    periodicite: z.enum(['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle']).default('mensuelle'),
    mode_paiement: z.enum(['prelevement_salaire', 'prelevement_bancaire', 'cheque']).optional(),
    origine_des_fonds: z.string().optional(),

    // ── Dates ────────────────────────────────────────────────
    date_effet: z.string().optional(),
    date_premiere_cotisation: z.string().optional(),

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

    // ── Contrat NSIA existant ────────────────────────────────
    deja_souscrit_nsia: z.boolean().default(false),
    details_contrat_nsia: z.string().optional(),

    // ── Bénéficiaires ────────────────────────────────────────
    beneficiaire_terme_assure: z.boolean().default(true),
    beneficiaire_deces_conjoint: z.boolean().default(false),
    beneficiaire_deces_enfants: z.boolean().default(false),
    beneficiaire_deces_autres: z.boolean().default(false),
}).passthrough();

export type EtudesFormData = z.infer<typeof EtudesFormSchema>;

export interface EtudesPayload {
    banque: string | number;

    // Paramètres calcul
    age_parent: number;
    age_enfant: number;
    montant_rente: number;
    duree_paiement: number;
    duree_service: number;
    duree: number;
    prime_periodique_commerciale: number;

    // Client (assuré)
    nom: string;
    prenom: string;
    date_naissance: string;
    email: string;
    telephone: string;
    cellulaire: string;
    titre_assure: string;
    numero_compte: string;
    lieu_naissance: string;
    nationalite: string;
    type_piece_identite: string;
    numero_piece_identite: string;
    situation_matrimoniale: string;
    profession: string;
    employeur: string;
    poste: string;
    adresse_postale: string;
    adresse_geographique: string;
    telephone_domicile: string;
    telephone_bureau: string;
    adresse_employeur: string;
    telephone_employeur: string;

    // Correspondant
    correspondant_nom: string;
    correspondant_prenom: string;
    correspondant_adresse: string;
    correspondant_telephone: string;
    correspondant_cellulaire: string;

    // Modalités
    periodicite: string;
    mode_paiement: string;
    origine_des_fonds: string;
    date_effet: string;
    date_premiere_cotisation: string;

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

    // NSIA existant
    deja_souscrit_nsia: boolean;
    details_contrat_nsia: string;

    // Bénéficiaires
    beneficiaire_terme_assure: boolean;
    beneficiaire_deces_conjoint: boolean;
    beneficiaire_deces_enfants: boolean;
    beneficiaire_deces_autres: boolean;
    beneficiaires: any[];

    sauvegarder: boolean;
}
