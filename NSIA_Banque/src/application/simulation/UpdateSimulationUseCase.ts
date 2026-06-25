/**
 * Application: Update Simulation Use Case
 * Orchestrates the update of a simulation using the domain layer
 */

import { ProductContext } from '@/src/domain/products';
import { getProduct, hasProductDomain } from '@/src/domain/products';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';
import { simulationApiService, SimulationApiService } from '@/src/infrastructure/api/SimulationApiService';

export interface UpdateSimulationInput {
    simulationId: string;
    productType: string;
    formData: any;
    context: ProductContext;
}

export interface UpdateSimulationResult {
    success: boolean;
    simulation?: any;
    error?: string;
}

/**
 * Use Case: Update Simulation
 * 
 * Applies domain-specific transformations when updating a simulation.
 */
export class UpdateSimulationUseCase {
    constructor(
        private apiService: SimulationApiService = simulationApiService
    ) { }

    async execute(input: UpdateSimulationInput): Promise<UpdateSimulationResult> {
        const { simulationId, productType, formData, context } = input;

        // Normalize product type
        const normalizedType = productType.toLowerCase().replace(/-/g, '_');

        try {
            let sanitizedData = { ...formData };

            // Apply domain-specific sanitization if available
            if (hasProductDomain(normalizedType)) {
                const product = getProduct(normalizedType);

                if (product) {
                    // For updates, we don't rebuild the entire payload
                    // but we apply type coercion for critical fields

                    // Sanitize beneficiaries if present
                    if (sanitizedData.beneficiaires) {
                        sanitizedData.beneficiaires = sanitizeBeneficiaries(sanitizedData.beneficiaires);
                    }

                    // Coerce numeric fields for Epargne Plus
                    if (normalizedType === 'epargne_plus') {
                        if (sanitizedData.cotisation_mensuelle) {
                            sanitizedData.cotisation_mensuelle = Number(sanitizedData.cotisation_mensuelle);
                        }
                        if (sanitizedData.duree_annees) {
                            sanitizedData.duree_annees = Number(sanitizedData.duree_annees);
                        }
                    }

                    // Map civility if present
                    if (sanitizedData.titre_assure) {
                        const titre = String(sanitizedData.titre_assure).toLowerCase().trim();
                        if (titre === 'monsieur') sanitizedData.titre_assure = 'M';
                        else if (titre === 'madame') sanitizedData.titre_assure = 'MME';
                        else if (titre === 'mademoiselle') sanitizedData.titre_assure = 'MLLE';
                    }

                    console.log(`[UpdateSimulation] Applied DOMAIN sanitization for ${normalizedType}`);
                }
            }

            // Call the API
            await this.apiService.update(simulationId, sanitizedData);

            // Fetch updated simulation
            const simulation = await this.apiService.getById(simulationId);

            return {
                success: true,
                simulation,
            };
        } catch (error: any) {
            console.error('[UpdateSimulation] Error:', error);
            return {
                success: false,
                error: error?.response?.data?.detail || error?.message || 'Une erreur est survenue',
            };
        }
    }
}

// Export singleton instance
export const updateSimulationUseCase = new UpdateSimulationUseCase();
