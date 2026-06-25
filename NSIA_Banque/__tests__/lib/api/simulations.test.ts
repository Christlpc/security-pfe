import { describe, it, expect, vi, beforeEach } from "vitest";
import { produitsApi } from "@/lib/api/simulations/produits";
import { historiqueApi } from "@/lib/api/simulations/historique";
import { souscriptionsApi } from "@/lib/api/simulations/souscriptions";
import { questionnairesApi } from "@/lib/api/simulations/questionnaires";
import { exportsApi } from "@/lib/api/simulations/exports";
import { apiClient } from "@/lib/api/client";

// Mock apiClient
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock config
vi.mock("@/lib/utils/config", () => ({
  USE_MOCK_DATA: false,
}));

describe("Simulations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("produitsApi", () => {
    it("should call simulateEmprunteur with correct data", async () => {
      const mockResponse = {
        simulation: { id: "123" },
        resultats: { prime_totale: 50000 },
        message: "Success",
      };

      (apiClient.post as any).mockResolvedValue({ data: mockResponse });

      const data = {
        montant_pret: 650000,
        duree_mois: 9,
        date_naissance: "1982-03-26",
        date_effet: "2025-02-01",
        nom: "Doe",
        prenom: "John",
        email: "john@example.com",
        telephone: "+242123456789",
        sauvegarder: true,
      };

      const result = await produitsApi.simulateEmprunteur(data);

      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/simulations/emprunteur/", data);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("historiqueApi", () => {
    it("should get simulations with filters", async () => {
      const mockResponse = {
        count: 10,
        next: null,
        previous: null,
        results: [],
      };

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const filters = { statut: "brouillon", page: 1 };
      const result = await historiqueApi.getSimulations(filters);

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("should validate a simulation", async () => {
      const mockSimulation = { id: "123", statut: "validee" };
      (apiClient.post as any).mockResolvedValue({ data: mockSimulation });

      const result = await historiqueApi.validateSimulation("123");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/simulations/historique/123/valider/",
        {}
      );
      expect(result).toEqual(mockSimulation);
    });
  });

  describe("souscriptionsApi", () => {
    it("should get souscriptions with filters", async () => {
      const mockResponse = {
        count: 5,
        next: null,
        previous: null,
        results: [],
      };

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const filters = { statut: "en_attente", page: 1 };
      const result = await souscriptionsApi.getSouscriptions(filters);

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("should validate a souscription", async () => {
      const mockSouscription = { id: "123", statut: "validee" };
      (apiClient.post as any).mockResolvedValue({ data: mockSouscription });

      const result = await souscriptionsApi.validateSouscription("123");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/simulations/souscriptions/123/valider/"
      );
      expect(result).toEqual(mockSouscription);
    });
  });

  describe("questionnairesApi", () => {
    it("should create a questionnaire", async () => {
      const mockQuestionnaire = {
        id: 123,
        taille_cm: 175,
        poids_kg: 70,
        fumeur: false,
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
        simulation: "sim-123",
      };

      const result = await questionnairesApi.createQuestionnaire(data);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/simulations/questionnaires-medicaux/",
        data
      );
      expect(result).toEqual(mockQuestionnaire);
    });
  });

  describe("exportsApi", () => {
    it("should export BIA as blob", async () => {
      const mockBlob = new Blob(["PDF content"], { type: "application/pdf" });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const result = await exportsApi.exportBIA("123");

      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/v1/simulations/simulations/123/export-bia/",
        { responseType: "blob" }
      );
      expect(result).toBeInstanceOf(Blob);
    });
  });
});

