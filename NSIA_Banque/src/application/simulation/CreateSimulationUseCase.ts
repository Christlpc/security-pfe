/**
 * Application: Create Simulation Use Case
 * Orchestrates the creation of a simulation using the domain layer
 */

import { ProductContext } from '@/src/domain/products';
import { getProduct, hasProductDomain } from '@/src/domain/products';
import { simulationApiService, productApiMethodMap, SimulationApiService } from '@/src/infrastructure/api/SimulationApiService';

export interface CreateSimulationInput {
    productType: string;
    formData: any;
    context: ProductContext;
}

export interface CreateSimulationResult {
    success: boolean;
    simulation?: any;
    resultats?: any;
    error?: string;
}

/**
 * Use Case: Create Simulation
 * 
 * This separates the orchestration logic from the store,
 * making it easier to test and maintain.
 */
export class CreateSimulationUseCase {
    constructor(
        private apiService: SimulationApiService = simulationApiService
    ) { }

    async execute(input: CreateSimulationInput): Promise<CreateSimulationResult> {
        const { productType, formData, context } = input;

        // Normalize product type
        const normalizedType = productType.toLowerCase().replace(/-/g, '_');

        try {
            let payload: any;

            // Check if we have a domain implementation for this product
            if (hasProductDomain(normalizedType)) {
                // Use domain layer to build payload (STRICT typing)
                const product = getProduct(normalizedType);
                if (!product) {
                    return { success: false, error: `Product not found: ${normalizedType}` };
                }
                payload = product.buildPayload(formData, context);
                console.log(`[CreateSimulation] Using DOMAIN layer for ${normalizedType}`);
            } else {
                // Legacy: pass data as-is (for products not yet migrated)
                payload = { ...formData, banque: context.banqueId };
                console.log(`[CreateSimulation] Using LEGACY path for ${normalizedType}`);
            }

            // Get the appropriate API method
            const apiMethod = productApiMethodMap[normalizedType];
            if (!apiMethod) {
                return { success: false, error: `Unsupported product type: ${normalizedType}` };
            }

            // Call the API
            const response = await this.apiService[apiMethod](payload);

            return {
                success: true,
                simulation: response.simulation,
                resultats: response.resultats,
            };
        } catch (error: any) {
            console.error('[CreateSimulation] Error:', error);
            return {
                success: false,
                error: error?.response?.data?.detail || error?.message || 'Une erreur est survenue',
            };
        }
    }
}

// Export singleton instance for convenience
export const createSimulationUseCase = new CreateSimulationUseCase();
