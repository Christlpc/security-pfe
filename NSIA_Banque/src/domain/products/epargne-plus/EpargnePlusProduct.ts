/**
 * Domain: Epargne Plus Product
 * Encapsulates all business logic for the Epargne Plus insurance product
 */

import { BaseProduct, ProductContext, ValidationResult, BaseProductPayload } from '@/src/domain/products/base/Product';
import { Beneficiary, sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';
import { EpargnePlusFormSchema, EpargnePlusFormData } from './EpargnePlusSchema';

/**
 * Epargne Plus specific payload structure
 * This EXACTLY matches the API contract (Postman reference)
 */
export interface EpargnePlusPayload extends BaseProductPayload {
    // Numbers - MUST be numbers, not strings
    cotisation_mensuelle: number;
    duree_annees: number;

    // Strings
    periodicite: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    titre_assure: string;
    date_naissance: string;
    lieu_naissance: string;
    situation_matrimoniale: string;
    profession: string;
    employeur: string;
    adresse_postale: string;

    // Bank info
    numero_compte: string;
    numero_compte_cle: string;
    banque_client: string;
    agence_client: string;
    numero_convention: string;

    // NSIA history
    deja_souscrit_nsia: boolean;
    contrats_nsia_existants: string;

    // Dates
    date_effet: string;
    date_premiere_cotisation: string;

    // Payment
    mode_paiement: string;
    origine_fonds: string;
    // Meta
    avec_details?: boolean;
}

/**
 * Epargne Plus Product Implementation
 */
export class EpargnePlusProduct extends BaseProduct<EpargnePlusFormData, EpargnePlusPayload> {
    constructor() {
        super('epargne_plus', 'Épargne Plus');
    }

    get schema() {
        return EpargnePlusFormSchema;
    }

    /**
     * Override sanitize to enforce numeric types for specific fields
     */
    sanitize(data: Partial<EpargnePlusFormData>): Partial<EpargnePlusFormData> {
        const clean = super.sanitize(data);

        if ((clean as any).cotisation_mensuelle !== undefined) {
            clean.cotisation_mensuelle = Number((clean as any).cotisation_mensuelle);
        }

        if ((clean as any).duree_annees !== undefined) {
            clean.duree_annees = Number((clean as any).duree_annees);
        }

        return clean;
    }

    /**
     * Builds the API payload from form data
     * ALL type coercion and sanitization happens HERE
     */
    buildPayload(data: EpargnePlusFormData, context: ProductContext): EpargnePlusPayload {
        return {
            // Bank reference
            banque: context.banqueId,

            // STRICT NUMBERS
            cotisation_mensuelle: Number(data.cotisation_mensuelle),
            duree_annees: Number(data.duree_annees),

            // Periodicite with fallback
            periodicite: data.periodicite || 'M',

            // Client info - all cleaned strings
            nom: this.cleanString(data.nom),
            prenom: this.cleanString(data.prenom),
            email: this.cleanString(data.email) || '',
            telephone: this.cleanString(data.telephone) || '',
            titre_assure: this.mapCivility(data.titre_assure),
            date_naissance: this.formatDate(data.date_naissance) || '',
            lieu_naissance: this.cleanString(data.lieu_naissance) || 'Pointe-Noire',
            situation_matrimoniale: this.cleanString(data.situation_matrimoniale) || 'marie',
            profession: this.cleanString(data.profession) || '',
            employeur: this.cleanString(data.employeur) || '',
            adresse_postale: this.cleanString(data.adresse) || '',

            // Bank info - Dynamically set from context (User's bank)
            numero_compte: this.cleanString(data.numero_compte) || '0012345678',
            numero_compte_cle: String(data.numero_compte_cle || '06'),
            // Fix: Force short bank names for BIA display
            // BOA = BANK OF AFRICA, BGFI = BGFI BANK CONGO
            banque_client: (() => {
                // Priority 1: Existing data (from update)
                if ((data as any).banque_client) return (data as any).banque_client;

                // Priority 2: Context
                const nom = context.banqueNom || '';
                if (nom === 'BANK OF AFRICA' || nom.toUpperCase().includes('BANK OF AFRICA')) return 'BOA';
                if (nom === 'BGFI BANK CONGO' || nom.toUpperCase().includes('BGFI')) return 'BGFI';
                return nom || 'BOA';
            })(),
            agence_client: (() => {
                // Priority 1: Existing data (from update)
                // Check multiple possible fields as API might return different casing/naming
                if ((data as any).agence_client) return (data as any).agence_client;
                if ((data as any).agence) return (data as any).agence;

                // Priority 2: Context (User's agency)
                return context.agenceNom || "BOASIEGE";
            })(),
            numero_convention: '1000359',

            // NSIA history
            deja_souscrit_nsia: data.deja_souscrit_nsia ?? false,
            contrats_nsia_existants: this.cleanString(data.contrats_nsia_existants) || 'N/A',

            // Dates
            date_effet: this.formatDate(data.date_effet) || this.getDefaultDateEffet(),
            date_premiere_cotisation: this.formatDate(data.date_premiere_cotisation) || this.getDefaultDateEffet(),

            // Payment
            mode_paiement: data.mode_paiement || 'prelevement_bancaire',
            origine_fonds: data.origine_fonds || 'salaire',

            // STRICT BENEFICIARIES - sanitized to only allowed fields with numeric types
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),

            // Meta
            avec_details: data.avec_details ?? false,
            sauvegarder: data.sauvegarder ?? true,
        };
    }

    /**
     * Validates form data using Zod schema
     */
    validate(data: EpargnePlusFormData): ValidationResult {
        const result = EpargnePlusFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };
        return super.formatZodError(result);
    }

    /**
     * Returns default values for Epargne Plus form
     */
    getDefaultValues(): Partial<EpargnePlusFormData> {
        return {
            periodicite: 'M',
            situation_matrimoniale: 'celibataire',
            mode_paiement: 'prelevement_bancaire',
            origine_fonds: 'salaire',
            deja_souscrit_nsia: false,
            sauvegarder: true,
            beneficiaires: [],
        };
    }
}

// Export singleton instance
export const epargnePlusProduct = new EpargnePlusProduct();
