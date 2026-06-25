/**
 * Infrastructure: Simulation Repository
 * Single point of access for all simulation-related API operations
 * Consolidates calls from multiple API modules
 */

import { simulationApi, exportsApi } from '@/lib/api/simulations';
import { produitsApi } from '@/lib/api/simulations/produits';
import type { Simulation, SimulationFilters, SimulationCreateData } from '@/types';

/**
 * Product type to API method mapping
 */
const PRODUCT_API_MAP: Record<string, keyof typeof produitsApi> = {
    'epargne_plus': 'simulateEpargnePlus',
    'emprunteur': 'simulateEmprunteur',
    'elikia_scolaire': 'simulateElikia',
    'confort_etudes': 'simulateEtudes',
    'confort_retraite': 'simulateRetraite',
    'mobateli': 'simulateMobateli',
};

export interface CreateSimulationResponse {
    simulation?: Simulation;
    resultats?: any;
    message?: string;
}

export interface SimulationListResponse {
    results: Simulation[];
    count: number;
}

/**
 * Simulation Repository
 * Provides a clean interface to all simulation operations
 */
export const simulationRepository = {
    /**
     * Fetch paginated list of simulations
     */
    async list(filters?: SimulationFilters): Promise<SimulationListResponse> {
        return simulationApi.getSimulations(filters);
    },

    /**
     * Get a single simulation by ID
     */
    async getById(id: string): Promise<Simulation> {
        return simulationApi.getSimulation(id);
    },

    /**
     * Create a new simulation for a specific product
     */
    async create(productType: string, payload: any): Promise<CreateSimulationResponse> {
        const normalizedType = productType.toLowerCase().replace(/-/g, '_');
        const apiMethod = PRODUCT_API_MAP[normalizedType];

        if (!apiMethod) {
            throw new Error(`Unsupported product type: ${normalizedType}`);
        }

        const method = produitsApi[apiMethod] as (payload: any) => Promise<any>;
        return method(payload);
    },

    /**
     * Update an existing simulation
     */
    async update(id: string, data: Partial<SimulationCreateData>): Promise<Simulation> {
        return simulationApi.updateSimulation(id, data);
    },

    /**
     * Delete a simulation
     */
    async delete(id: string): Promise<void> {
        return simulationApi.deleteSimulation(id);
    },

    /**
     * Calculate premium for a simulation
     */
    async calculatePrime(id: string): Promise<any> {
        return simulationApi.calculatePrime(id);
    },

    /**
     * Validate a simulation
     */
    async validate(id: string): Promise<any> {
        return simulationApi.validateSimulation(id);
    },

    /**
     * Convert simulation to subscription
     */
    async convert(id: string, data?: any): Promise<any> {
        return simulationApi.convertSimulation(id, data);
    },

    /**
     * Export simulations
     */
    async export(format: 'csv' | 'json', filters?: SimulationFilters): Promise<Blob> {
        return format === 'csv'
            ? exportsApi.exportCsv(filters)
            : exportsApi.exportJson(filters);
    },

    /**
     * Get export statistics
     */
    async getExportStats(filters?: SimulationFilters): Promise<any> {
        return exportsApi.getExportStats(filters);
    },
};

export type SimulationRepository = typeof simulationRepository;

