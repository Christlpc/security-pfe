import { Beneficiary, BeneficiaryQualite, sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';
import { z } from 'zod';

/**
 * Configuration for the Beneficiary UI Component and Validation
 */
export interface BeneficiaryConfig {
    isVisible: boolean;
    isRequired: boolean;
    maxBeneficiaries: number;
    allowedQualites: BeneficiaryQualite[];
    excludesAssureFromTotal?: boolean; // For Confort Retraite logic
    isEditable?: boolean;
}

/**
 * Context passed to product builders containing user/session info
 */
export interface ProductContext {
    banqueId: string;
    banqueNom: string;
    banqueCode: string;
    agenceId?: string;
    agenceNom: string;
    agenceCode: string;
    userId: string;
}

/**
 * Base payload structure common to all products
 */
export interface BaseProductPayload {
    banque: string | number;
    beneficiaires: Beneficiary[];
    sauvegarder: boolean;
    avec_details?: boolean;
}

/**
 * Result of payload validation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string[]>;
}

// Re-export Zod for convenience
export const BaseProductSchema = z.object({
    nom: z.string().min(2, "Le nom est requis"),
    prenom: z.string().min(2, "Le prénom est requis"),
    email: z.string().email("L'email est invalide").optional().or(z.literal("")),
    telephone: z.string().optional(),
    adresse: z.string().optional(),
    titre_assure: z.string().optional(),
    date_naissance: z.string().optional(),
    lieu_naissance: z.string().optional(),
    situation_matrimoniale: z.string().optional(),
    profession: z.string().optional(),
    employeur: z.string().optional(),
    numero_compte: z.string().optional(),
    mode_paiement: z.string().optional(),
    origine_fonds: z.string().optional(),
    date_effet: z.string().optional(),
    periodicite: z.string().optional(),
    sauvegarder: z.boolean().optional(),
    beneficiaires: z.array(z.any()).optional(),
});

/**
 * Abstract base class for all insurance products
 * Each product (Emprunteur, Elikia, etc.) must extend this
 */
export abstract class BaseProduct<TFormData extends z.infer<typeof BaseProductSchema>, TPayload extends BaseProductPayload> {
    readonly productType: string;
    readonly productLabel: string;

    constructor(productType: string, productLabel: string) {
        this.productType = productType;
        this.productLabel = productLabel;
    }

    /**
     * Configuration for beneficiaries (UI and Validation)
     * Valid defaults for most products (can be overridden)
     */
    get beneficiaryConfig(): BeneficiaryConfig {
        return {
            isVisible: true,
            isRequired: true,
            maxBeneficiaries: 10,
            allowedQualites: ['conjoint', 'enfant', 'parent', 'frere_soeur', 'autre'],
            isEditable: true
        };
    }

    /**
     * Sanitizes partial form data (useful for updates)
     */
    sanitize(data: Partial<TFormData>): Partial<TFormData> {
        const clean = { ...data };
        if (clean.beneficiaires) {
            clean.beneficiaires = sanitizeBeneficiaries(clean.beneficiaires);
        }
        return clean;
    }

    /**
     * Builds the API payload from form data
     * This is where all type coercion and sanitization happens
     */
    abstract buildPayload(data: TFormData, context: ProductContext): TPayload;

    /**
     * Validates form data before building payload
     */
    abstract validate(data: TFormData): ValidationResult;

    /**
     * Returns default values for this product's form
     */

    abstract getDefaultValues(): Partial<TFormData>;

    /**
     * Exposes the Zod schema for UI validation
     */
    abstract get schema(): z.ZodType<any>;

    /**
     * Helper to format Zod errors
     */
    protected formatZodError(result: z.SafeParseError<any>): ValidationResult {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (!errors[path]) errors[path] = [];
            errors[path].push(issue.message);
        }
        return { isValid: false, errors };
    }

    /**
     * Helper to clean strings (trim whitespace)
     */
    protected cleanString(value: any): string {
        if (typeof value !== 'string') return String(value || '');
        return value.trim();
    }

    /**
     * Helper to format dates to YYYY-MM-DD
     */
    protected formatDate(date: any): string | undefined {
        if (!date) return undefined;
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
        try {
            const d = new Date(date);
            return d.toISOString().split('T')[0];
        } catch {
            return undefined;
        }
    }

    /**
     * Helper to get today's date as default
     */
    protected getDefaultDateEffet(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Helper to map civility - return short code for backend API
     * Backend expects 'M', 'MME', 'MLLE' (validated choices on serializer)
     */
    protected mapCivility(titre: string | undefined): string {
        if (!titre) return 'M';

        const clean = String(titre).replace(/[^a-zA-Zà-ÿÀ-Ÿ]/g, '').toLowerCase();

        if (clean.includes('mademoiselle') || clean === 'mlle') return 'MLLE';
        if (clean.includes('madame') || clean === 'mme') return 'MME';
        return 'M';
    }

    /**
     * Helper to calculate age from date of birth
     */
    protected calculateAge(dateNaissance: string | Date | undefined): number {
        if (!dateNaissance) return 0;
        const birthDate = typeof dateNaissance === 'string' ? new Date(dateNaissance) : dateNaissance;
        if (isNaN(birthDate.getTime())) return 0;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}
