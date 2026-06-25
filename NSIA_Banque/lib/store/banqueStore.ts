import { create } from "zustand";
import type { Banque } from "@/types";
import { banqueApi, type BanqueCreateData, type BanqueUpdateData } from "@/lib/api/banques";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { useAuthStore } from "@/lib/store/authStore";
import { ROLES } from "@/lib/utils/constants";
import toast from "react-hot-toast";

interface BanqueStore {
  banques: Banque[];
  currentBanque: Banque | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last fetch

  // Actions
  fetchBanques: (force?: boolean) => Promise<void>;
  fetchBanque: (id: number | string) => Promise<void>;
  createBanque: (data: BanqueCreateData) => Promise<Banque>;
  updateBanque: (id: number | string, data: BanqueUpdateData) => Promise<Banque>;
  deleteBanque: (id: number | string) => Promise<void>;
  reset: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds cache

export const useBanqueStore = create<BanqueStore>((set, get) => ({
  banques: [],
  currentBanque: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchBanques: async (force = false) => {
    // Check if user is admin before making API call
    const user = useAuthStore.getState().user;
    const isAdmin = user?.role?.toUpperCase() === ROLES.SUPER_ADMIN_NSIA.toUpperCase() ||
      user?.role?.toUpperCase() === ROLES.ADMIN_NSIA.toUpperCase();

    if (!isAdmin) {
      console.log("[BanqueStore] Skip: user is not admin");
      return;
    }

    const { isLoading, lastFetched, banques } = get();

    // Skip if already loading
    if (isLoading) {
      console.log("[BanqueStore] Skip: already loading");
      return;
    }

    // Skip if recently fetched (within CACHE_DURATION) and not forced
    if (!force && lastFetched && banques.length > 0) {
      const timeSinceLastFetch = Date.now() - lastFetched;
      if (timeSinceLastFetch < CACHE_DURATION) {
        console.log(`[BanqueStore] Skip: cached (${Math.round(timeSinceLastFetch / 1000)}s ago)`);
        return;
      }
    }

    set({ isLoading: true, error: null });
    try {
      const response = await banqueApi.getBanques();
      console.log("[BanqueStore] Banques loaded:", response.results?.length || 0);
      set({
        banques: response.results,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error: any) {
      console.error("[BanqueStore] Error:", error);
      const statusCode = error?.response?.status;
      set({
        error: error?.message || "Erreur lors du chargement des banques",
        isLoading: false,
      });
      // Don't show toast for permission errors (403/401) - user just doesn't have access
      if (statusCode !== 403 && statusCode !== 401) {
        toast.error("Erreur lors du chargement des banques");
      }
    }
  },

  fetchBanque: async (id: number | string) => {
    set({ isLoading: true, error: null });
    try {
      const banque = await banqueApi.getBanque(id);
      set({ currentBanque: banque, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.message || "Erreur lors du chargement de la banque",
        isLoading: false,
      });
      toast.error("Erreur lors du chargement de la banque");
    }
  },

  createBanque: async (data: BanqueCreateData) => {
    set({ isLoading: true, error: null });
    let tempId: string | number | null = null;
    try {
      // Optimistic update avec un ID temporaire
      tempId = `temp-${Date.now()}`;
      const tempBanque: Banque = {
        id: tempId,
        nom: data.nom,
        code: data.code.toUpperCase(),
        email: data.email,
        telephone: data.telephone,
        adresse: data.adresse,
        produits_disponibles: data.produits_disponibles as any,
        date_partenariat: data.date_partenariat,
        nombre_simulations: 0,
      };

      set((state) => ({
        banques: [...state.banques, tempBanque],
      }));

      // Appel API
      const newBanque = await banqueApi.createBanque(data);

      // Remplacer la banque temporaire par la vraie
      set((state) => ({
        banques: state.banques.map((b) => (b.id === tempId ? newBanque : b)),
        isLoading: false,
      }));

      toast.success("Banque créée avec succès");

      // Notification
      useNotificationStore.getState().addNotification({
        type: "banque",
        priority: "medium",
        title: "Nouvelle banque créée",
        message: `La banque ${newBanque.nom} a été créée avec succès`,
        action_url: `/banques/${newBanque.id}`,
        action_label: "Voir la banque",
        metadata: { banque_id: newBanque.id },
      });

      return newBanque;
    } catch (error: any) {
      // Rollback
      if (tempId !== null) {
        set((state) => ({
          banques: state.banques.filter((b) => b.id !== tempId),
        }));
      }
      set({
        error: error?.message || "Erreur lors de la création",
        isLoading: false,
      });
      toast.error(error?.message || "Erreur lors de la création");
      throw error;
    }
  },

  updateBanque: async (id: number | string, data: BanqueUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      // Optimistic update
      const oldBanque = get().banques.find((b) => String(b.id) === String(id));
      if (oldBanque) {
        set((state) => ({
          banques: state.banques.map((b) =>
            String(b.id) === String(id)
              ? {
                ...b,
                nom: data.nom ?? b.nom,
                code: data.code ? data.code.toUpperCase() : b.code,
                email: data.email !== undefined ? data.email : b.email,
                telephone: data.telephone !== undefined ? data.telephone : b.telephone,
                adresse: data.adresse !== undefined ? data.adresse : b.adresse,
                produits_disponibles: (data.produits_disponibles as any) ?? b.produits_disponibles,
                date_partenariat: data.date_partenariat !== undefined ? data.date_partenariat : b.date_partenariat,
              }
              : b
          ),
        }));
      }

      // Appel API
      const updatedBanque = await banqueApi.updateBanque(id, data);

      set((state) => ({
        banques: state.banques.map((b) => (b.id === id ? updatedBanque : b)),
        currentBanque: state.currentBanque?.id === id ? updatedBanque : state.currentBanque,
        isLoading: false,
      }));

      toast.success("Banque modifiée avec succès");

      // Notification
      useNotificationStore.getState().addNotification({
        type: "banque",
        priority: "low",
        title: "Banque mise à jour",
        message: `Les informations de la banque ${updatedBanque.nom} ont été modifiées`,
        action_url: `/banques/${id}`,
        action_label: "Voir la banque",
        metadata: { banque_id: id },
      });

      return updatedBanque;
    } catch (error: any) {
      // Rollback
      const oldBanque = get().banques.find((b) => b.id === id);
      if (oldBanque) {
        set((state) => ({
          banques: state.banques.map((b) => (b.id === id ? oldBanque : b)),
        }));
      }
      set({
        error: error?.message || "Erreur lors de la modification",
        isLoading: false,
      });
      toast.error(error?.message || "Erreur lors de la modification");
      throw error;
    }
  },

  deleteBanque: async (id: number | string) => {
    set({ isLoading: true, error: null });
    // Sauvegarde pour rollback
    const deletedBanque = get().banques.find((b) => String(b.id) === String(id));
    try {
      // Optimistic update
      set((state) => ({
        banques: state.banques.filter((b) => String(b.id) !== String(id)),
      }));

      await banqueApi.deleteBanque(id);
      set({ isLoading: false });
      toast.success("Banque supprimée avec succès");

      // Notification
      useNotificationStore.getState().addNotification({
        type: "banque",
        priority: "high",
        title: "Banque supprimée",
        message: `La banque ${deletedBanque?.nom || ''} a été supprimée`,
        action_url: "/banques",
        action_label: "Voir les banques",
      });
    } catch (error: any) {
      // Rollback
      if (deletedBanque) {
        set((state) => ({
          banques: [...state.banques, deletedBanque],
        }));
      }
      set({
        error: error?.message || "Erreur lors de la suppression",
        isLoading: false,
      });
      toast.error(error?.message || "Erreur lors de la suppression");
      throw error;
    }
  },

  reset: () => {
    set({
      banques: [],
      currentBanque: null,
      isLoading: false,
      error: null,
    });
  },
}));
