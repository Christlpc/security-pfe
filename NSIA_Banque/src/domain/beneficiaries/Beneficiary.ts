/**
 * Domain: Beneficiary
 * Represents a beneficiary in an insurance simulation
 */

export interface Beneficiary {
    qualite: BeneficiaryQualite;
    nom_prenoms: string;
    part_pourcentage: number;
    ordre: number;
}

export type BeneficiaryQualite =
    | 'conjoint'
    | 'enfant'
    | 'parent'
    | 'frere_soeur'
    | 'autre'
    | 'assure'
    | 'organisme_pret'
    | 'enfant_a_naitre';

export const BENEFICIARY_QUALITES: Record<BeneficiaryQualite, string> = {
    conjoint: 'Conjoint',
    enfant: 'Enfant',
    parent: 'Parent',
    frere_soeur: 'Frère/Sœur',
    autre: 'Autre',
    assure: 'Assuré',
    organisme_pret: 'Organisme Prêteur',
    enfant_a_naitre: 'Enfant à naître',
};

/**
 * Sanitizes a raw beneficiary object into the strict Beneficiary format
 * This ensures numeric fields are numbers and only allowed fields are included
 * IMPORTANT: part_pourcentage MUST be formatted with 2 decimals (e.g., 100.00)
 */
export function sanitizeBeneficiary(raw: any): Beneficiary {
    return {
        qualite: raw.qualite,
        nom_prenoms: String(raw.nom_prenoms || ''),
        part_pourcentage: Number(raw.part_pourcentage),
        ordre: Number(raw.ordre),
    };
}

/**
 * Sanitizes an array of raw beneficiaries
 */
export function sanitizeBeneficiaries(rawList: any[] | undefined | null): Beneficiary[] {
    if (!rawList || !Array.isArray(rawList)) return [];
    return rawList.map(sanitizeBeneficiary);
}

/**
 * Validates that beneficiaries total percentages equal 100%
 */
export function validateBeneficiariesTotal(beneficiaries: Beneficiary[]): {
    isValid: boolean;
    total: number;
    message: string;
} {
    const total = beneficiaries.reduce((sum, b) => sum + Number(b.part_pourcentage), 0);
    const isValid = Math.abs(total - 100) < 0.01;

    return {
        isValid,
        total,
        message: isValid
            ? `Total des parts : ${total.toFixed(2)}%`
            : `Total des parts invalide : ${total.toFixed(2)}% (doit être 100%)`,
    };
}
