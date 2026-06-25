import { create } from "zustand";
import type { SimulationFilters, SimulationCreateData, ProduitType } from "@/types";
import { PRODUIT_LABELS } from "@/types";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { simulationApi, exportsApi } from "@/lib/api/simulations";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";
import { getProduct, ProductContext } from "@/src/domain/products";

// Créer un mapping inverse label -> clé
const PRODUIT_KEYS: Record<string, ProduitType> = Object.entries(PRODUIT_LABELS).reduce(
  (acc, [key, label]) => {
    acc[label.toLowerCase()] = key as ProduitType;
    return acc;
  },
  {} as Record<string, ProduitType>
);

// Ajouter des mappings supplémentaires pour les variations courantes
PRODUIT_KEYS["mobateli (dtc/iad)"] = "mobateli";
PRODUIT_KEYS["emprunteur (adi)"] = "emprunteur";
PRODUIT_KEYS["confort études"] = "confort_etudes";
PRODUIT_KEYS["épargne plus"] = "epargne_plus";

/**
 * Normalise le nom du produit (label ou clé) vers la clé standard
 */
function normalizeProductKey(product: string): ProduitType {
  if (!product) return 'emprunteur'; // Safe default

  const lower = product.toLowerCase().trim();

  // 1. Try exact match in labels (e.g. "confort_retraite")
  if (PRODUIT_LABELS[lower as ProduitType]) {
    return lower as ProduitType;
  }

  // 2. Try mapping from human readable labels (e.g. "Epargne Plus" -> "epargne_plus")
  if (PRODUIT_KEYS[lower]) {
    return PRODUIT_KEYS[lower];
  }

  // 3. Fallback: Standardize separators (dashed to underscore) commonly used in URLs/APIs
  // e.g. "confort-retraite" -> "confort_retraite"
  const standardized = lower.replace(/-/g, '_');
  if (PRODUIT_LABELS[standardized as ProduitType]) {
    return standardized as ProduitType;
  }

  // 4. Ultimate fallback - return as is, but cleaner
  return standardized as ProduitType;
}

interface WizardData {
  step: number;
  simulationData: any | null;
  questionnaireData: any | null;
  createdSimulationId?: string;
  biaInfo?: any;
  beneficiaires?: {
    qualite: string;
    nom_prenoms: string;
    part_pourcentage: number;
    ordre: number;
  }[];
}

interface SimulationStore {
  simulations: SimulationResponse[];
  currentSimulation: SimulationResponse | null;
  filters: SimulationFilters;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last fetch
  exportStats: any | null;
  // Wizard State
  wizardData: WizardData;

  fetchSimulations: (params?: SimulationFilters, force?: boolean) => Promise<void>;
  fetchSimulation: (id: string) => Promise<void>;
  createSimulation: (product: string, data: SimulationCreateData) => Promise<SimulationResponse>;
  updateSimulation: (id: string, data: Partial<SimulationCreateData>) => Promise<void>;
  deleteSimulation: (id: string) => Promise<void>;
  calculatePrime: (id: string) => Promise<void>; // @deprecated - Ne plus utiliser
  validateSimulation: (id: string) => Promise<void>;
  convertSimulation: (id: string, data?: any) => Promise<void>;
  setFilters: (filters: Partial<SimulationFilters>) => void;
  setCurrentSimulation: (simulation: SimulationResponse | null) => void;
  reset: () => void;

  // Wizard Actions
  setWizardStep: (step: number) => void;
  updateWizardData: (data: Partial<WizardData>) => void;
  resetWizard: () => void;

  // Export Actions
  exportSimulations: (format: 'csv' | 'json', filtersOverride?: Partial<SimulationFilters>) => Promise<void>;
  fetchExportStats: (filtersOverride?: Partial<SimulationFilters>) => Promise<void>;
}

const initialFilters: SimulationFilters = {
  page: 1,
};

const CACHE_DURATION = 30000; // 30 seconds cache

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simulations: [],
  currentSimulation: null,
  filters: initialFilters,
  totalCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  exportStats: null,

  // Wizard Initial State
  wizardData: {
    step: 1,
    simulationData: null,
    questionnaireData: null,
    createdSimulationId: undefined,
    biaInfo: null,
  },

  fetchSimulations: async (params?: SimulationFilters, force = false) => {
    const state = get();

    // Merge params with existing filters
    const filters = { ...state.filters, ...params };

    // If force is true, always fetch (user-triggered action)
    if (!force) {
      // Skip if already loading and not forced
      if (state.isLoading) {
        console.log("[SimulationStore] Skip: already loading (use force=true to override)");
        return;
      }

      // Skip if cached and filters haven't changed
      if (state.lastFetched && state.simulations.length > 0) {
        const timeSinceLastFetch = Date.now() - state.lastFetched;
        const filtersMatch = JSON.stringify(filters) === JSON.stringify(state.filters);
        if (filtersMatch && timeSinceLastFetch < CACHE_DURATION) {
          console.log(`[SimulationStore] Skip: cached (${Math.round(timeSinceLastFetch / 1000)}s ago)`);
          return;
        }
      }
    }

    set({ isLoading: true, error: null, filters });
    try {
      const response = await simulationApi.getSimulations(filters);
      set({
        simulations: response.results,
        totalCount: response.count,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors du chargement des simulations",
      });
    }
  },

  fetchSimulation: async (id: string) => {
    // Clear current simulation explicitly to avoid stale data persistence
    set({ isLoading: true, error: null, currentSimulation: null });
    try {
      const simulation = await simulationApi.getSimulation(id);
      set({
        currentSimulation: simulation,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors du chargement de la simulation",
      });
    }
  },

  createSimulation: async (product: string, data: SimulationCreateData) => {
    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticSimulation = {
      id: tempId,
      reference: `SIM-TEMP-${tempId}`,
      produit: product as any,
      statut: "brouillon",
      ...data,
      // Map create data to client fields for optimistic update
      nom_client: data.nom,
      prenom_client: data.prenom,
      email_client: data.email || "",
      telephone_client: data.telephone || "",
      adresse_postale: data.adresse,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 1,
      banque: 2,
    } as unknown as SimulationResponse;

    // Add optimistically
    set((state) => ({
      simulations: [optimisticSimulation, ...state.simulations],
      totalCount: state.totalCount + 1,
      isLoading: true,
      error: null,
    }));

    try {
      let response;
      const { produitsApi } = await import("@/lib/api/simulations/produits");

      // Normaliser le produit (peut être un label ou une clé)
      const normalizedProduct = normalizeProductKey(product);

      console.log("--- NEW VERSION LOADED [Step 910 - SM FIX] ---");
      console.log("createSimulation called with:", product, data);
      console.log("[DEBUG-SM] data.mode_calcul =", JSON.stringify(data.mode_calcul), "| type:", typeof data.mode_calcul);
      console.log("[DEBUG-SM] All data keys:", Object.keys(data).filter(k => ['mode_calcul', 'volet', 'prime_souhaitee', 'duree_sur_mesure', 'type_prime', 'capital_sur_mesure'].includes(k)));
      console.log("[DEBUG-SM] data.volet =", JSON.stringify((data as any).volet));

      // ===== DOMAIN-DRIVEN DESIGN MIGRATION =====
      // Dynamic import of the product registry
      const { getProduct } = await import("@/src/domain/products/index");
      const productHandler = getProduct(normalizedProduct);

      if (!productHandler) {
        throw new Error(`Produit non supporté ou non migré: ${normalizedProduct}`);
      }

      // Build context
      const user = useAuthStore.getState().user as any;
      const userBanque = user?.banque;

      const context = {
        banqueId: typeof userBanque === 'object' ? userBanque?.id : userBanque,
        banqueNom: typeof userBanque === 'object' ? userBanque?.nom : "BOA",
        banqueCode: typeof userBanque === 'object' ? userBanque?.code : "00000",
        agenceId: user?.agence?.id,
        agenceNom: user?.agence?.nom || "BOASIEGE",
        agenceCode: user?.agence?.code || "00000",
        userId: user?.id,
      };

      console.log(`[DDD] Building payload for ${productHandler.productLabel} (${normalizedProduct})`);

      // 1. Validate Data
      const validation = productHandler.validate(data as any);
      if (!validation.isValid) {
        console.error("[DDD] Validation failed:", validation.errors);
        throw new Error("Validation échouée: " + Object.values(validation.errors).flat().join(", "));
      }

      // 2. Build Payload
      // Pour Mobateli Sur Mesure, on skip le buildPayload forfaitaire
      // et on utilise directement buildSurMesurePayload
      const isMobateliSurMesure = normalizedProduct === 'mobateli' && data.mode_calcul === 'sur_mesure';
      let payload: any;

      if (isMobateliSurMesure) {
        const { MobateliProduct } = await import("@/src/domain/products/mobateli/MobateliProduct");
        const mobProduct = productHandler as InstanceType<typeof MobateliProduct>;
        payload = mobProduct.buildSurMesurePayload(data as any, context);
        console.log("[DDD] Mobateli Sur Mesure Payload:", JSON.stringify(payload, null, 2));
      } else {
        payload = productHandler.buildPayload(data as any, context);
        console.log("[DDD] Generated Payload:", JSON.stringify(payload, null, 2));
        console.log("[DDD] date_naissance value:", JSON.stringify(payload.date_naissance), "type:", typeof payload.date_naissance);
      }

      // 3. Send to API - Dynamic dispatch
      switch (normalizedProduct) {
        case 'emprunteur':
          response = await produitsApi.simulateEmprunteur(payload as any);
          break;
        case 'epargne_plus':
          response = await produitsApi.simulateEpargnePlus(payload as any);
          break;
        case 'elikia_scolaire':
          response = await produitsApi.simulateElikia(payload as any);
          break;
        case 'mobateli':
          // Dispatch conditionnel : forfaitaire vs sur mesure
          if (isMobateliSurMesure) {
            response = await produitsApi.simulateMobateliSurMesure(payload as any);
          } else {
            response = await produitsApi.simulateMobateli(payload as any);
          }
          break;
        case 'confort_retraite':
          response = await produitsApi.simulateRetraite(payload as any);
          break;
        case 'confort_etudes':
          response = await produitsApi.simulateEtudes(payload as any);
          break;
        default:
          throw new Error(`API call not mapped for product: ${normalizedProduct}`);
      }

      // La réponse contient { simulation, resultats, message }
      // Si sauvegarder=true, simulation est présent
      const simulation = response.simulation;

      if (!simulation) {
        // Si c'est une simulation simple (sauvegarder: false), on retourne les résultats
        // et on annule l'ajout optimiste dans la liste
        if (data.sauvegarder === false && response.resultats) {
          set((state) => ({
            simulations: state.simulations.filter((s) => s.id !== tempId),
            totalCount: state.totalCount - 1,
            isLoading: false,
            error: null,
          }));
          // On retourne les résultats comme si c'était une simulation (pour l'affichage)
          return { ...data, ...response.resultats } as any;
        }
        throw new Error("La simulation n'a pas été sauvegardée");
      }

      // Replace optimistic with real data
      set((state) => ({
        simulations: state.simulations.map((s) =>
          s.id === tempId ? simulation : s
        ),
        isLoading: false,
        error: null,
      }));

      // Toast only - no need for duplicate notification
      toast.success(`Simulation ${simulation.reference} créée avec succès`);

      return simulation;
    } catch (error: any) {
      // Rollback on error
      set((state) => ({
        simulations: state.simulations.filter((s) => s.id !== tempId),
        totalCount: state.totalCount - 1,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors de la création de la simulation",
      }));
      throw error;
    }
  },

  updateSimulation: async (id: string, data: Partial<SimulationCreateData>) => {
    // Optimistic update
    const previousSimulations = get().simulations;
    const previousSimulation = get().currentSimulation;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s
      ),
      currentSimulation: state.currentSimulation?.id === id
        ? { ...state.currentSimulation, ...data, updated_at: new Date().toISOString() }
        : state.currentSimulation,
      isLoading: true,
      error: null,
    }));

    try {
      const { user } = useAuthStore.getState();
      const currentSim = get().currentSimulation;

      if (!currentSim || !user || !user.banque) {
        throw new Error("Impossible de mettre à jour : données de session ou simulation manquantes");
      }

      // 1. Identifier le produit
      const produit = normalizeProductKey(currentSim.produit);

      // 2. Récupérer le handler produit
      const productHandler = getProduct(produit);
      if (!productHandler) {
        throw new Error(`Produit non supporté: ${produit}`);
      }

      // 3. Construire le contexte produit
      // Cast user to any to access agence which might not be in the strict type yet
      const safeUser = user as any;
      const context: ProductContext = {
        banqueId: (typeof safeUser.banque === 'string' ? safeUser.banque : safeUser.banque?.id).toString(),
        banqueNom: typeof safeUser.banque === 'string' ? '' : safeUser.banque?.nom,
        banqueCode: typeof safeUser.banque === 'string' ? '' : safeUser.banque?.code,
        userId: safeUser.id.toString(),
        // Agence optionnelle, mais importante pour le BIA
        agenceNom: safeUser.agence?.nom || "BOASIEGE",
        agenceCode: safeUser.agence?.code || "00000"
      };

      // 4. Fusionner les données actuelles avec les modifications
      // On utilise donnees_entree comme base si dispo car plus complet pour buildPayload
      const baseData = currentSim.donnees_entree || currentSim;
      const mergedData = { ...baseData, ...data };

      // 5. Générer le payload via le handler DDD
      // Note: buildPayload s'occupe du nettoyage (cleanString) et du typage (Number, etc.)
      const payload = productHandler.buildPayload(mergedData, context);

      // Force avec_details à false si non défini pour la mise à jour (comme avant)
      if (payload.avec_details === undefined) {
        payload.avec_details = false;
      }

      // 6. Appel API
      await simulationApi.updateSimulation(id, payload);
      await get().fetchSimulation(id);
      set({ isLoading: false, error: null });
    } catch (error: any) {
      // Rollback on error
      set({
        simulations: previousSimulations,
        currentSimulation: previousSimulation,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors de la mise à jour",
      });
      throw error;
    }
  },

  deleteSimulation: async (id: string) => {
    // Optimistic update
    const deletedSimulation = get().simulations.find((s) => s.id === id);
    const previousSimulations = get().simulations;

    set((state) => ({
      simulations: state.simulations.filter((s) => s.id !== id),
      totalCount: state.totalCount - 1,
      currentSimulation: state.currentSimulation?.id === id ? null : state.currentSimulation,
      isLoading: true,
      error: null,
    }));

    try {
      await simulationApi.deleteSimulation(id);
      set({ isLoading: false, error: null });
      toast.success("Simulation supprimée avec succès");
    } catch (error: any) {
      // Rollback on error
      set({
        simulations: previousSimulations,
        totalCount: previousSimulations.length,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors de la suppression",
      });
      throw error;
    }
  },

  calculatePrime: async (id: string) => {
    // Optimistic update
    const previousSimulation = get().currentSimulation;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, statut: "calculee" as const, updated_at: new Date().toISOString() } : s
      ),
      currentSimulation: state.currentSimulation?.id === id
        ? { ...state.currentSimulation, statut: "calculee" as const, updated_at: new Date().toISOString() }
        : state.currentSimulation,
      isLoading: true,
      error: null,
    }));

    try {
      await simulationApi.calculatePrime(id);
      await get().fetchSimulation(id);
      set({ isLoading: false, error: null });
    } catch (error: any) {
      // Rollback on error
      set({
        currentSimulation: previousSimulation,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors du calcul",
      });
      throw error;
    }
  },

  validateSimulation: async (id: string) => {
    // Optimistic update
    const previousSimulation = get().currentSimulation;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, statut: "validee" as const, updated_at: new Date().toISOString() } : s
      ),
      currentSimulation: state.currentSimulation?.id === id
        ? { ...state.currentSimulation, statut: "validee" as const, updated_at: new Date().toISOString() }
        : state.currentSimulation,
      isLoading: true,
      error: null,
    }));

    try {
      await simulationApi.validateSimulation(id);
      await get().fetchSimulation(id);
      set({ isLoading: false, error: null });

      // Single toast notification - no duplicates
      toast.success("Simulation validée avec succès");
    } catch (error: any) {
      // Rollback on error
      set({
        currentSimulation: previousSimulation,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors de la validation",
      });
      throw error;
    }
  },

  convertSimulation: async (id: string, data?: any) => {
    // Optimistic update
    const previousSimulation = get().currentSimulation;

    set((state) => ({
      simulations: state.simulations.map((s) =>
        s.id === id ? { ...s, statut: "convertie" as const, updated_at: new Date().toISOString() } : s
      ),
      currentSimulation: state.currentSimulation?.id === id
        ? { ...state.currentSimulation, statut: "convertie" as const, updated_at: new Date().toISOString() }
        : state.currentSimulation,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await simulationApi.convertSimulation(id, data);
      await get().fetchSimulation(id);
      set({ isLoading: false, error: null });

      // Single toast notification with reference (not ID)
      // Prioritize reference over ID for user-friendly display
      const souscriptionRef = (response as any).souscription?.reference ||
        response.reference ||
        (response as any).souscription_reference;
      toast.success(`Simulation convertie en souscription ${souscriptionRef ? souscriptionRef : 'avec succès'}`);
    } catch (error: any) {
      // Rollback on error
      set({
        currentSimulation: previousSimulation,
        isLoading: false,
        error: error?.response?.data?.detail || "Erreur lors de la conversion",
      });
      throw error;
    }
  },

  setFilters: (filters: Partial<SimulationFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setCurrentSimulation: (simulation: SimulationResponse | null) => {
    set({ currentSimulation: simulation });
  },

  reset: () => {
    set({
      simulations: [],
      currentSimulation: null,
      filters: initialFilters,
      totalCount: 0,
      error: null,
    });
  },
  // Wizard Actions
  setWizardStep: (step: number) => {
    set((state) => ({
      wizardData: { ...state.wizardData, step },
    }));
  },

  updateWizardData: (data: Partial<WizardData>) => {
    set((state) => ({
      wizardData: { ...state.wizardData, ...data },
    }));
  },

  resetWizard: () => {
    set({
      wizardData: {
        step: 1,
        simulationData: null,
        questionnaireData: null,
      },
    });
  },

  exportSimulations: async (format: 'csv' | 'json', filtersOverride?: Partial<SimulationFilters>) => {
    console.log("Exporting simulations in format:", format);
    try {
      set({ isLoading: true });
      // Utiliser les filtres passés en argument ou ceux du store
      const baseFilters = filtersOverride || get().filters;
      // Exclure la pagination des filtres d'export pour avoir toutes les données
      const { page, page_size, ...exportFilters } = baseFilters;
      let blob: Blob;

      if (format === 'csv') {
        blob = await exportsApi.exportCsv(exportFilters);
      } else {
        blob = await exportsApi.exportJson(exportFilters);
      }

      // Créer et cliquer sur un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `simulations_export_${dateStr}.${format}`);
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      link.remove();
      window.URL.revokeObjectURL(url);

      set({ isLoading: false });
      toast.success(`Export ${format.toUpperCase()} réussi`);
    } catch (error: any) {
      console.error("Erreur lors de l'export:", error);
      set({
        isLoading: false,
        error: error?.message || "Erreur lors de l'export"
      });
      toast.error("Échec du téléchargement du fichier");
    }
  },

  fetchExportStats: async (filtersOverride?: Partial<SimulationFilters>) => {
    try {
      set({ isLoading: true });
      // Utiliser les filtres passés en argument ou ceux du store
      const baseFilters = filtersOverride || get().filters;
      // Exclure la pagination pour les stats aussi
      const { page, page_size, ...statsFilters } = baseFilters;
      const stats = await exportsApi.getExportStats(statsFilters);
      set({
        isLoading: false,
        exportStats: stats,
        error: null
      });
    } catch (error: any) {
      console.error("Erreur lors de la récupération des stats:", error);
      set({
        isLoading: false,
        error: error?.message || "Erreur lors de la récupération des statistiques"
      });
      // Silent error or toast? Let's use toast if it fails
      toast.error("Impossible de récupérer les statistiques");
    }
  },
}));

