/**
 * Utility functions for formatting currency and numbers
 * Ensures consistent thousand separator formatting across the application
 */

/**
 * Formats a number as currency in XAF (FCFA) with proper thousand separators
 * Uses explicit space separator to avoid non-breaking space issues
 * 
 * @param amount - The number to format (can be string or number)
 * @param options - Optional configuration
 * @returns Formatted currency string like "1 000 000 FCFA"
 */
export function formatCurrency(
    amount: number | string | undefined | null,
    options?: {
        showCurrency?: boolean; // Default: true - show "FCFA" suffix
        decimals?: number;      // Default: 0 - number of decimal places
    }
): string {
    const { showCurrency = true, decimals = 0 } = options || {};

    if (amount === undefined || amount === null || amount === "") {
        return showCurrency ? "- FCFA" : "-";
    }

    const num = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(num)) {
        return showCurrency ? "- FCFA" : "-";
    }

    // Format with explicit regular space as thousand separator
    // This avoids issues with non-breaking spaces that may not render properly
    const formatted = num
        .toFixed(decimals)
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    return showCurrency ? `${formatted} FCFA` : formatted;
}

/**
 * Formats a number with thousand separators (no currency)
 * 
 * @param value - The number to format
 * @param decimals - Optional decimal places (default: 0)
 * @returns Formatted number string like "1 000 000"
 */
export function formatNumber(
    value: number | string | undefined | null,
    decimals: number = 0
): string {
    return formatCurrency(value, { showCurrency: false, decimals });
}

/**
 * Formats a number as percentage
 * 
 * @param value - The percentage value
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage string like "15,5 %"
 */
export function formatPercentage(
    value: number | string | undefined | null,
    decimals: number = 1
): string {
    if (value === undefined || value === null || value === "") {
        return "- %";
    }

    const num = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(num)) {
        return "- %";
    }

    // Use French locale for decimal separator
    const formatted = num.toFixed(decimals).replace(".", ",");
    return `${formatted} %`;
}

/**
 * Helper to format numbers with thousand separators (French format)
 * This is widely used in simulation forms.
 */
export const formatNumberWithSpaces = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value.replace(/\s/g, "")) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString("fr-FR");
};

/**
 * Helper to parse formatted number (with spaces) back to number
 */
export const parseFormattedNumber = (value: string): number => {
    const cleaned = value.replace(/\s/g, "").replace(/,/g, ".");
    return parseFloat(cleaned) || 0;
};
