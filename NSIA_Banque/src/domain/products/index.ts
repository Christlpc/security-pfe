/**
 * Domain: Product Registry
 * Central registry for all insurance products
 */

import { BaseProduct, ProductContext } from '@/src/domain/products/base/Product';
import { epargnePlusProduct } from '@/src/domain/products/epargne-plus/EpargnePlusProduct';

import { emprunteurProduct } from '@/src/domain/products/emprunteur/EmprunteurProduct';
import { elikiaProduct } from '@/src/domain/products/elikia-scolaire/ElikiaProduct';
import { mobateliProduct } from '@/src/domain/products/mobateli/MobateliProduct';
import { confortRetraiteProduct } from '@/src/domain/products/confort-retraite/ConfortRetraiteProduct';
import { confortEtudesProduct } from '@/src/domain/products/confort-etudes/ConfortEtudesProduct';

// Map of product type to product instance
const productRegistry = new Map<string, BaseProduct<any, any>>();

// Register all products
productRegistry.set('epargne_plus', epargnePlusProduct);
productRegistry.set('emprunteur', emprunteurProduct);
productRegistry.set('elikia_scolaire', elikiaProduct);
productRegistry.set('mobateli', mobateliProduct);
productRegistry.set('confort_retraite', confortRetraiteProduct);
productRegistry.set('confort_etudes', confortEtudesProduct);

/**
 * Get product instance by type
 */
export function getProduct(productType: string): BaseProduct<any, any> | undefined {
    // Normalize product type
    const normalized = productType.toLowerCase().replace(/-/g, '_');
    return productRegistry.get(normalized);
}

/**
 * Check if a product type has a domain implementation
 */
export function hasProductDomain(productType: string): boolean {
    const normalized = productType.toLowerCase().replace(/-/g, '_');
    return productRegistry.has(normalized);
}

/**
 * Build payload for a product
 * Falls back to undefined if product not found (legacy handling)
 */
export function buildProductPayload(
    productType: string,
    data: any,
    context: ProductContext
): any | undefined {
    const product = getProduct(productType);
    if (!product) return undefined;
    return product.buildPayload(data, context);
}

/**
 * Get all registered product types
 */
export function getRegisteredProducts(): string[] {
    return Array.from(productRegistry.keys());
}

export type { ProductContext };
