/**
 * Store: Simplified Simulation Store Slice
 * 
 * This is a simplified version of the simulation store that:
 * 1. Delegates business logic to the domain layer
 * 2. Uses the repository for API calls
 * 3. Only manages UI state
 * 
 * This can be used as a drop-in replacement for heavy operations.
 */

import { simulationRepository } from '@/src/infrastructure/api';
import { createSimulationUseCase } from '@/src/application/simulation';
import { getProduct, hasProductDomain, ProductContext } from '@/src/domain/products';
import type { Simulation, SimulationFilters, SimulationCreateData, ProduitType, User } from '@/types';

/**
 * Build ProductContext from user session
 */
export function buildProductContext(user: User | null | undefined): ProductContext {
    const userBanque = user?.banque;

    // Handle case where banque might be just an ID (legacy) or an object
    // Although User type says Banque | null, runtime might differ in some contexts
    const isBanqueObject = typeof userBanque === 'object' && userBanque !== null;

    return {
        banqueId: isBanqueObject ? (userBanque as any).id : (userBanque || 'BOA'),
        banqueNom: isBanqueObject ? (userBanque as any).nom : 'BOA',
        banqueCode: isBanqueObject ? (userBanque as any).code : '00000',
        agenceId: (user as any)?.agence?.id,
        agenceNom: (user as any)?.agence?.nom || 'BOASIEGE',
        agenceCode: (user as any)?.agence?.code || '00000',
        userId: user?.id ? String(user.id) : '',
    };
}

/**
 * Simplified create simulation action
 * Uses domain layer for products that have been migrated
 */
export async function createSimulationSimplified(
    productType: string,
    formData: SimulationCreateData,
    user: User | null | undefined
): Promise<{ success: boolean; simulation?: Simulation; resultats?: any; error?: string }> {
    const normalizedType = productType.toLowerCase().replace(/-/g, '_') as ProduitType;
    const context = buildProductContext(user);

    // Use domain layer if product has been migrated
    if (hasProductDomain(normalizedType)) {
        const result = await createSimulationUseCase.execute({
            productType: normalizedType,
            formData,
            context,
        });

        return result;
    }

    // Fallback to direct repository call for non-migrated products
    try {
        const response = await simulationRepository.create(normalizedType, {
            ...formData,
            banque: context.banqueId,
        });

        return {
            success: true,
            simulation: response.simulation,
            resultats: response.resultats,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error?.response?.data?.detail || error?.message || 'Une erreur est survenue',
        };
    }
}

/**
 * Simplified update simulation action
 */
export async function updateSimulationSimplified(
    id: string,
    data: Partial<SimulationCreateData>,
    productType: string
): Promise<{ success: boolean; simulation?: Simulation; error?: string }> {
    const normalizedType = productType.toLowerCase().replace(/-/g, '_');

    try {
        // Apply domain sanitization if available
        let sanitizedData = { ...data };

        const product = getProduct(normalizedType);
        if (product) {
            sanitizedData = product.sanitize(sanitizedData);
        }

        const simulation = await simulationRepository.update(id, sanitizedData);

        return { success: true, simulation };
    } catch (error: any) {
        return {
            success: false,
            error: error?.response?.data?.detail || error?.message || 'Une erreur est survenue',
        };
    }
}

/**
 * Simplified delete simulation action
 */
export async function deleteSimulationSimplified(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await simulationRepository.delete(id);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error?.response?.data?.detail || error?.message || 'Une erreur est survenue',
        };
    }
}

/**
 * Fetch simulations using repository
 */
export async function fetchSimulationsSimplified(
    filters?: SimulationFilters
): Promise<{ simulations: Simulation[]; totalCount: number }> {
    const response = await simulationRepository.list(filters);
    return {
        simulations: response.results,
        totalCount: response.count,
    };
}

/**
 * Export these functions for use in the main store or as standalone actions
 */
export const simplifiedSimulationActions = {
    create: createSimulationSimplified,
    update: updateSimulationSimplified,
    delete: deleteSimulationSimplified,
    fetchList: fetchSimulationsSimplified,
    buildContext: buildProductContext,
};
