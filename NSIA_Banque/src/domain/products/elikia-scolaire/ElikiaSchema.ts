import { z } from 'zod';
import { BaseProductSchema } from '@/src/domain/products/base/Product';

// Schéma d'un élève/étudiant bénéficiaire
const EleveSchema = z.object({
    nom_prenoms: z.string().min(1, "Nom requis"),
    date_naissance: z.string().optional(),
    qualite: z.string().optional(), // "Fils", "Fille", "Neveu", etc.
});

export const ElikiaFormSchema = BaseProductSchema.extend({
    // ── Paramètres Elikia ────────────────────────────────────
    rente_annuelle: z.coerce.number().min(100000, "Rente minimum 100 000"),
    duree_rente: z.coerce.number().min(1, "Durée de rente minimum 1 an"),
    duree_engagement: z.coerce.number().min(1).optional(),
    age_parent: z.coerce.number().optional(),
    numero_convention: z.string().optional(),

    // ── Élèves / Étudiants bénéficiaires ─────────────────────
    eleves: z.array(EleveSchema).optional(),

    // ── Modalités paiement (aligné BIA Elikia) ───────────────
    mode_paiement: z.enum([
        'prelevement_bancaire',
        'especes',
        'precompte_salaire',
        'cheque',
        'mobile_money',
    ]).optional(),
    operateur_mobile_money: z.string().optional(),
    type_cotisation: z.enum(['prime_unique', 'cotisations_annuelles']).optional(),
    origine_des_fonds: z.string().optional(),

    // ── Dates ────────────────────────────────────────────────
    date_effet: z.string().optional(),
    date_premiere_prime: z.string().optional(),
    date_echeance: z.string().optional(),
    date_signature: z.string().optional(),
    date_fin: z.string().optional(),

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

    // ── Bénéficiaires décès ──────────────────────────────────
    beneficiaires: z.array(z.any()).optional(),
}).passthrough();

export type ElikiaFormData = z.infer<typeof ElikiaFormSchema>;

export interface ElikiaPayload {
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
    age_parent: number;
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
    numero_convention: string;
    numero_compte: string;

    // Correspondant
    correspondant_nom: string;
    correspondant_prenom: string;
    correspondant_adresse: string;
    correspondant_telephone: string;
    correspondant_cellulaire: string;

    // Dates
    date_signature: string;
    date_effet: string;
    date_fin: string;
    date_premiere_prime: string;
    date_echeance: string;

    // Produit
    duree_engagement: number;
    duree_rente: number;
    duree_contrat: number;
    rente_annuelle: number;

    // Élèves
    eleves: Array<{
        nom_prenoms: string;
        date_naissance: string;
        qualite: string;
    }>;

    // Paiement
    mode_paiement: string;
    operateur_mobile_money: string;
    type_cotisation: string;
    origine_des_fonds: string;

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

    // Bénéficiaires décès
    beneficiaires: any[];

    sauvegarder: boolean;
}
