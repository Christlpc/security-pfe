/**
 * Domain: Epargne Plus Product Schema
 * Zod validation schema for Epargne Plus form data
 */

import { z } from 'zod';

export const EpargnePlusFormSchema = z.object({
    // Client info
    nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    email: z.string().email('Email invalide').optional().or(z.literal('')),
    telephone: z.string()
        .min(1, 'Le téléphone est requis')
        .regex(/^(06|05|04|01)\d{7}$/, 'Format invalide'),
    date_naissance: z.string().min(1, 'La date de naissance est requise'),
    lieu_naissance: z.string().optional(),
    titre_assure: z.enum(['M', 'Mme', 'Mlle', 'Monsieur', 'Madame', 'Mademoiselle']).optional(),

    // Address & Employment
    adresse: z.string().min(1, "L'adresse est requise"),
    profession: z.string().min(1, 'La profession est requise'),
    employeur: z.string().min(1, "L'employeur est requis"),
    situation_matrimoniale: z.enum(['celibataire', 'marie', 'divorce', 'veuf']).optional(),

    // Bank info
    numero_compte: z.string().optional(),
    numero_compte_cle: z.string().optional(),

    // Product-specific fields
    cotisation_mensuelle: z.number().min(1000, 'La cotisation doit être au moins 1000 FCFA'),
    duree_annees: z.number().min(1, 'La durée doit être au moins 1 an').max(30, 'La durée maximum est 30 ans'),
    periodicite: z.enum(['M', 'T', 'S', 'A']).default('M'),

    // NSIA existing contracts
    deja_souscrit_nsia: z.boolean().optional(),
    contrats_nsia_existants: z.string().optional(),

    // Payment
    mode_paiement: z.enum(['especes', 'prelevement_bancaire', 'virement', 'cheque']).optional(),
    origine_fonds: z.enum(['salaire', 'epargne', 'heritage', 'autre']).optional(),

    // Dates
    date_effet: z.string().optional(),
    date_premiere_cotisation: z.string().optional(),

    // Beneficiaries
    beneficiaires: z.array(z.object({
        qualite: z.string(),
        nom_prenoms: z.string(),
        part_pourcentage: z.number(),
        ordre: z.number(),
    })).optional(),

    // Meta
    avec_details: z.boolean().optional().default(false),
    sauvegarder: z.boolean().default(true),
});

export type EpargnePlusFormData = z.infer<typeof EpargnePlusFormSchema>;
