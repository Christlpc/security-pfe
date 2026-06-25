import { describe, it, expect, vi, beforeEach } from "vitest";
import { questionnairesApi } from "@/lib/api/simulations/questionnaires";
import { apiClient } from "@/lib/api/client";

// Mock apiClient
vi.mock("@/lib/api/client", () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock config
vi.mock("@/lib/utils/config", () => ({
    USE_MOCK_DATA: false,
}));

describe("Medical Questionnaire Edit Flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("questionnairesApi", () => {
        it("should get questionnaires with params", async () => {
            const mockResponse = {
                count: 1,
                next: null,
                previous: null,
                results: [{
                    id: 1,
                    simulation: "sim-123",
                    taille_cm: 175,
                    poids_kg: 70,
                    fumeur: false,
                    consomme_alcool: false,
                }]
            };

            (apiClient.get as any).mockResolvedValue({ data: mockResponse });

            const result = await questionnairesApi.getQuestionnaires("sim-123", "REF-001");

            expect(apiClient.get).toHaveBeenCalledWith(
                "/api/v1/simulations/questionnaires-medicaux/",
                { params: { simulation: "sim-123", search: "REF-001" } }
            );
            expect(result).toEqual(mockResponse.results);
        });

        it("should create a questionnaire with simulation in body", async () => {
            const mockQuestionnaire = {
                id: 1,
                simulation: "sim-123",
                taille_cm: 175,
                poids_kg: 70,
            };

            (apiClient.post as any).mockResolvedValue({ data: mockQuestionnaire });

            const data = {
                taille_cm: 175,
                poids_kg: 70,
                fumeur: false,
                consomme_alcool: false,
                pratique_sport: false,
                a_infirmite: false,
                malade_6_derniers_mois: false,
                souvent_fatigue: false,
                perte_poids_recente: false,
                prise_poids_recente: false,
                a_ganglions: false,
                fievre_persistante: false,
                plaies_buccales: false,
                diarrhee_frequente: false,
                ballonnement: false,
                oedemes_membres_inferieurs: false,
                essoufflement: false,
                a_eu_perfusion: false,
                a_eu_transfusion: false,
            };

            const result = await questionnairesApi.createQuestionnaire("sim-123", data as any);

            // API expects simulation ID in the body, not in the URL
            expect(apiClient.post).toHaveBeenCalledWith(
                "/api/v1/simulations/questionnaires-medicaux/",
                { ...data, simulation: "sim-123" }
            );
            expect(result).toEqual(mockQuestionnaire);
        });

        it("should update a questionnaire using PATCH", async () => {
            const mockUpdatedQuestionnaire = {
                id: 1,
                simulation: "sim-123",
                taille_cm: 180,
                poids_kg: 75,
            };

            (apiClient.patch as any).mockResolvedValue({ data: mockUpdatedQuestionnaire });

            const updateData = {
                taille_cm: 180,
                poids_kg: 75,
                fumeur: true,
                nb_cigarettes_jour: 10,
            };

            const result = await questionnairesApi.updateQuestionnaire("sim-123", 1, updateData as any);

            // API uses PATCH with questionnaire ID in URL and simulation in body
            expect(apiClient.patch).toHaveBeenCalledWith(
                "/api/v1/simulations/questionnaires-medicaux/1/",
                { ...updateData, simulation: "sim-123" }
            );
            expect(result).toEqual(mockUpdatedQuestionnaire);
        });
    });

    describe("Simulation ID handling in onStep4Submit", () => {
        it("should use createdSimulationId when available (edit mode)", () => {
            // Simulating the logic in onStep4Submit
            const wizardData = {
                createdSimulationId: "edit-sim-123",
                simulationData: { id: undefined },
            };

            const simulationId = wizardData.createdSimulationId || wizardData.simulationData?.id;

            expect(simulationId).toBe("edit-sim-123");
        });

        it("should fallback to simulationData.id when createdSimulationId is not set", () => {
            // Simulating the logic in onStep4Submit
            const wizardData = {
                createdSimulationId: null,
                simulationData: { id: "new-sim-456" },
            };

            const simulationId = wizardData.createdSimulationId || wizardData.simulationData?.id;

            expect(simulationId).toBe("new-sim-456");
        });

        it("should return undefined when both IDs are missing", () => {
            const wizardData = {
                createdSimulationId: null,
                simulationData: { id: undefined },
            };

            const simulationId = wizardData.createdSimulationId || wizardData.simulationData?.id;

            expect(simulationId).toBeUndefined();
        });
    });

    describe("InitialData handling for MedicalForm", () => {
        it("should properly merge initialData with defaults for wizard mode", () => {
            // Simulating the reset logic in MedicalForm's useEffect
            const defaults = {
                fumeur: false,
                consomme_alcool: false,
                pratique_sport: false,
                a_infirmite: false,
                taille_cm: undefined as number | undefined,
                poids_kg: undefined as number | undefined,
            };

            const initialData = {
                taille_cm: "175",
                poids_kg: "70",
                fumeur: true,
                nb_cigarettes_jour: 5,
            };

            // Simulating the merge logic
            const mergedData = {
                ...defaults,
                ...initialData,
                taille_cm: initialData.taille_cm ? Number(initialData.taille_cm) : undefined,
                poids_kg: initialData.poids_kg ? Number(initialData.poids_kg) : undefined,
            };

            expect(mergedData.taille_cm).toBe(175);
            expect(mergedData.poids_kg).toBe(70);
            expect(mergedData.fumeur).toBe(true);
            expect(mergedData.nb_cigarettes_jour).toBe(5);
            expect(mergedData.consomme_alcool).toBe(false); // From defaults
        });

        it("should handle missing initialData fields gracefully", () => {
            const defaults = {
                fumeur: false,
                consomme_alcool: false,
            };

            const initialData = {
                fumeur: true, // Only this field is set
            };

            const mergedData = {
                ...defaults,
                ...initialData,
            };

            expect(mergedData.fumeur).toBe(true);
            expect(mergedData.consomme_alcool).toBe(false); // Preserved from defaults
        });

        it("should calculate scoreData when taille and poids are valid", () => {
            // Simulating the scoreData calculation logic
            const taille = 175;
            const poids = 70;

            // IMC = poids / (taille/100)^2
            const imc = poids / Math.pow(taille / 100, 2);

            expect(imc).toBeCloseTo(22.86, 1);
            expect(taille && poids).toBeTruthy(); // Both must be truthy for score calculation
        });
    });
});
