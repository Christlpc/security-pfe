import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSimulationStore } from '@/lib/store/simulationStore';
import { simulationApi } from '@/lib/api/simulations';
import { useAuthStore } from '@/lib/store/authStore';
import { getProduct } from '@/src/domain/products';

// Mock dependencies
vi.mock('@/lib/api/simulations', () => ({
    simulationApi: {
        updateSimulation: vi.fn(),
        getSimulation: vi.fn(), // fetchSimulation calls this
    }
}));

vi.mock('@/lib/store/authStore', () => ({
    useAuthStore: {
        getState: vi.fn(),
    }
}));

vi.mock('@/src/domain/products', () => ({
    getProduct: vi.fn(),
}));

describe('simulationStore.updateSimulation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useSimulationStore.setState({
            simulations: [],
            currentSimulation: null,
            isLoading: false,
            error: null
        });
    });

    it('should call api with payload from product handler', async () => {
        // Setup initial store state
        const mockCurrentSimulation = {
            id: 'sim_123',
            produit: 'emprunteur',
            donnees_entree: {
                nom: 'OldName',
                montant_pret: 1000000
            }
        };
        useSimulationStore.setState({
            currentSimulation: mockCurrentSimulation as any
        });

        // Mock Auth Store
        (useAuthStore.getState as any).mockReturnValue({
            user: {
                id: 'user_1',
                banque: { id: 'banque_1', nom: 'MyBank', code: 'MB' }
            }
        });

        // Mock Product Handler
        const mockBuildPayload = vi.fn().mockReturnValue({
            some_field: 'payload_value'
        });
        (getProduct as any).mockReturnValue({
            buildPayload: mockBuildPayload
        });

        // Mock API
        (simulationApi.updateSimulation as any).mockResolvedValue({});
        (simulationApi.getSimulation as any).mockResolvedValue(mockCurrentSimulation); // for re-fetch

        // Execute update
        const updateData = { nom: 'NewName' };
        await useSimulationStore.getState().updateSimulation('sim_123', updateData as any);

        // Assertions
        expect(getProduct).toHaveBeenCalledWith('emprunteur');
        expect(mockBuildPayload).toHaveBeenCalled();

        // valid merged data passed to buildPayload
        const expectedMergedData = {
            nom: 'NewName', // updated
            montant_pret: 1000000 // preserved
        };
        expect(mockBuildPayload).toHaveBeenCalledWith(
            expect.objectContaining(expectedMergedData),
            expect.objectContaining({
                userId: 'user_1',
                banqueId: 'banque_1'
            })
        );

        // valid payload sent to API
        expect(simulationApi.updateSimulation).toHaveBeenCalledWith(
            'sim_123',
            expect.objectContaining({ some_field: 'payload_value', avec_details: false })
        );
    });
});
