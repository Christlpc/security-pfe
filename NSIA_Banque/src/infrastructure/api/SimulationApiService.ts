/**
 * Infrastructure: Simulation API Service
 * Thin wrapper around existing API calls for dependency injection
 */

import { produitsApi } from '@/lib/api/simulations/produits';
import { simulationApi } from '@/lib/api/simulations';

export interface SimulationApiService {
    createEpargnePlus(payload: any): Promise<any>;
    createEmprunteur(payload: any): Promise<any>;
    createElikia(payload: any): Promise<any>;
    createConfortEtudes(payload: any): Promise<any>;
    createConfortRetraite(payload: any): Promise<any>;
    createMobateli(payload: any): Promise<any>;

    update(id: string, data: any): Promise<any>;
    getById(id: string): Promise<any>;
}

/**
 * Default implementation using existing API modules
 */
export const simulationApiService: SimulationApiService = {
    createEpargnePlus: (payload) => produitsApi.simulateEpargnePlus(payload),
    createEmprunteur: (payload) => produitsApi.simulateEmprunteur(payload),
    createElikia: (payload) => produitsApi.simulateElikia(payload),
    createConfortEtudes: (payload) => produitsApi.simulateEtudes(payload),
    createConfortRetraite: (payload) => produitsApi.simulateRetraite(payload),
    createMobateli: (payload) => produitsApi.simulateMobateli(payload),

    update: (id, data) => simulationApi.updateSimulation(id, data),
    getById: (id) => simulationApi.getSimulation(id),
};

/**
 * Product type to API method mapping
 */
export const productApiMethodMap: Record<string, keyof Pick<SimulationApiService,
    'createEpargnePlus' | 'createEmprunteur' | 'createElikia' |
    'createConfortEtudes' | 'createConfortRetraite' | 'createMobateli'>> = {
    'epargne_plus': 'createEpargnePlus',
    'emprunteur': 'createEmprunteur',
    'elikia_scolaire': 'createElikia',
    'confort_etudes': 'createConfortEtudes',
    'confort_retraite': 'createConfortRetraite',
    'mobateli': 'createMobateli',
};
