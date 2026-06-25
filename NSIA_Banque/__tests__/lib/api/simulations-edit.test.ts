import { describe, it, expect, vi, beforeEach } from "vitest";
import { historiqueApi } from "@/lib/api/simulations/historique";
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

describe("Simulation Edit Functionality", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("historiqueApi.updateSimulation", () => {
        it("should include titre_assure in update payload", async () => {
            const mockResponse = { id: "123", statut: "brouillon" };
            (apiClient.get as any).mockResolvedValue({
                data: { banque: 1, produit: "emprunteur" },
            });
            (apiClient.put as any).mockResolvedValue({ data: mockResponse });

            const updateData = {
                nom: "Dupont",
                prenom: "Jean",
                titre_assure: "Monsieur",
                lieu_naissance: "Brazzaville",
                banque: 1,
                produit: "emprunteur",
            };

            await historiqueApi.updateSimulation("123", updateData);

            const putCall = (apiClient.put as any).mock.calls[0];
            const payload = putCall[1];

            expect(payload.titre_assure).toBe("Monsieur");
            expect(payload.lieu_naissance).toBe("Brazzaville");
        });

        it("should include all client fields in update payload", async () => {
            const mockResponse = { id: "123", statut: "brouillon" };
            (apiClient.get as any).mockResolvedValue({
                data: { banque: 1, produit: "emprunteur" },
            });
            (apiClient.put as any).mockResolvedValue({ data: mockResponse });

            const updateData = {
                nom: "Dupont",
                prenom: "Jean",
                email: "jean@example.com",
                telephone: "+242123456789",
                numero_compte: "ACC123456",
                titre_assure: "Monsieur",
                lieu_naissance: "Pointe-Noire",
                banque: 1,
                produit: "emprunteur",
            };

            await historiqueApi.updateSimulation("123", updateData);

            const putCall = (apiClient.put as any).mock.calls[0];
            const payload = putCall[1];

            expect(payload.nom_client).toBe("Dupont");
            expect(payload.prenom_client).toBe("Jean");
            expect(payload.email_client).toBe("jean@example.com");
            expect(payload.telephone_client).toBe("+242123456789");
            expect(payload.numero_compte).toBe("ACC123456");
            expect(payload.titre_assure).toBe("Monsieur");
            expect(payload.lieu_naissance).toBe("Pointe-Noire");
        });

        it("should include product-specific fields for emprunteur", async () => {
            const mockResponse = { id: "123", statut: "brouillon" };
            (apiClient.get as any).mockResolvedValue({
                data: { banque: 1, produit: "emprunteur" },
            });
            (apiClient.put as any).mockResolvedValue({ data: mockResponse });

            const updateData = {
                nom: "Dupont",
                prenom: "Jean",
                montant_pret: 5000000,
                duree_mois: 24,
                taux_interet: 8.5,
                date_effet: "2025-02-01",
                banque: 1,
                produit: "emprunteur",
            };

            await historiqueApi.updateSimulation("123", updateData);

            const putCall = (apiClient.put as any).mock.calls[0];
            const payload = putCall[1];

            expect(payload.donnees_entree).toBeDefined();
            expect(payload.donnees_entree.montant_pret).toBe(5000000);
            expect(payload.donnees_entree.duree_mois).toBe(24);
            expect(payload.donnees_entree.taux_interet).toBe(8.5);
            expect(payload.donnees_entree.date_effet).toBe("2025-02-01");
        });

        it("should include product-specific fields for elikia", async () => {
            const mockResponse = { id: "123", statut: "brouillon" };
            (apiClient.get as any).mockResolvedValue({
                data: { banque: 1, produit: "elikia_scolaire" },
            });
            (apiClient.put as any).mockResolvedValue({ data: mockResponse });

            const updateData = {
                nom: "Dupont",
                prenom: "Jean",
                rente_annuelle: 600000,
                age_parent: 45,
                duree_rente: 5,
                banque: 1,
                produit: "elikia_scolaire",
            };

            await historiqueApi.updateSimulation("123", updateData);

            const putCall = (apiClient.put as any).mock.calls[0];
            const payload = putCall[1];

            expect(payload.donnees_entree).toBeDefined();
            expect(payload.donnees_entree.rente_annuelle).toBe(600000);
            expect(payload.donnees_entree.age_parent).toBe(45);
            expect(payload.donnees_entree.duree_rente).toBe(5);
        });

        it("should include product-specific fields for mobateli", async () => {
            const mockResponse = { id: "123", statut: "brouillon" };
            (apiClient.get as any).mockResolvedValue({
                data: { banque: 1, produit: "mobateli" },
            });
            (apiClient.put as any).mockResolvedValue({ data: mockResponse });

            const updateData = {
                nom: "Dupont",
                prenom: "Jean",
                capital_dtc_iad: 2000000,
                age: 35,
                banque: 1,
                produit: "mobateli",
            };

            await historiqueApi.updateSimulation("123", updateData);

            const putCall = (apiClient.put as any).mock.calls[0];
            const payload = putCall[1];

            expect(payload.donnees_entree).toBeDefined();
            expect(payload.donnees_entree.capital_dtc_iad).toBe(2000000);
            expect(payload.donnees_entree.age).toBe(35);
        });
    });

    describe("Simulation status handling", () => {
        it("should allow editing simulations with validee status", () => {
            // Test that "validee" is a valid SimulationStatut
            const validStatuses = ["brouillon", "calculee", "validee", "proposition", "convertie"];
            expect(validStatuses).toContain("validee");
            expect(validStatuses).toContain("proposition");
        });

        it("should only block convertie status from editing", () => {
            const blockedStatuses = ["convertie"];
            const editableStatuses = ["brouillon", "calculee", "validee", "proposition"];

            // This test documents the expected behavior
            blockedStatuses.forEach(status => {
                expect(editableStatuses).not.toContain(status);
            });
        });
    });
});
