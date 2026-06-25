/**
 * Presentation: Shared Types for Simulation Forms
 */

import { ProduitType } from '@/types';

/**
 * Beneficiary entry as used in forms
 */
export interface BeneficiaryEntry {
    qualite: 'conjoint' | 'enfant' | 'parent' | 'autre' | 'organisme_pret' | 'assure' | 'enfant_a_naitre';
    nom_prenoms: string;
    part_pourcentage: number;
    ordre: number;
}

/**
 * Common form field props
 */
export interface FormFieldProps {
    label: string;
    name: string;
    error?: string;
    required?: boolean;
}

/**
 * Product form props passed to each product-specific form
 */
export interface ProductFormProps {
    register: any;
    errors: any;
    watch: any;
    setValue: any;
    trigger: any;
    beneficiaires: BeneficiaryEntry[];
    onBeneficiairesChange: (beneficiaires: BeneficiaryEntry[]) => void;
    productType: ProduitType;
}

/**
 * Format number with French thousand separators
 */
export function formatNumberWithSpaces(value: number | string | undefined): string {
    if (value === undefined || value === null || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('fr-FR');
}

/**
 * Format CFA amount (rounded, no decimals)
 */
export function formatCFA(value: number | string | undefined | null): string {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '').replace(/,/g, '.')) : value;
    if (isNaN(num)) return '-';
    return Math.round(num).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

/**
 * Parse formatted number back to number
 */
export function parseFormattedNumber(value: string): number {
    const cleaned = value.replace(/\s/g, '').replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
}
