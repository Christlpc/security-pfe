import { create } from "zustand";
import type { Agence } from "@/types";
import { agencesApi, type AgenceCreateData, type AgenceUpdateData } from "@/lib/api/agences";
import { useAuthStore } from "@/lib/store/authStore";
import { ROLES } from "@/lib/utils/constants";
import toast from "react-hot-toast";

interface AgenceStore {
    agences: Agence[];
    currentAgence: Agence | null;
    totalCount: number;
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;

    // Actions
    fetchAgences: (params?: { page?: number; page_size?: number; search?: string; banque?: string; active?: boolean }, force?: boolean) => Promise<void>;
    fetchAgence: (id: string) => Promise<void>;
    createAgence: (data: AgenceCreateData) => Promise<Agence>;
    updateAgence: (id: string, data: AgenceUpdateData) => Promise<Agence>;
    deleteAgence: (id: string) => Promise<void>;
    reset: () => void;
}

export const useAgenceStore = create<AgenceStore>((set, get) => ({
    agences: [],
    currentAgence: null,
    totalCount: 0,
    isLoading: false,
    error: null,
    lastFetched: null,

    fetchAgences: async (params, force = false) => {
        const state = get();
        const CACHE_DURATION = 30000;
        if (!force && state.lastFetched && (Date.now() - state.lastFetched < CACHE_DURATION)) {
            return;
        }

        set({ isLoading: true, error: null });
        console.time("[AgenceStore] Total Fetch Time");
        try {
            // 1. Fetch first page
            console.time("[AgenceStore] First Page Fetch");
            const firstResponse = await agencesApi.getAgences({
                ...params,
                page: 1,
                page_size: 20
            });
            console.timeEnd("[AgenceStore] First Page Fetch");

            let allAgences = [...firstResponse.results];
            const totalCount = firstResponse.count;

            const backendPageSize = firstResponse.results.length || 20;
            const totalPagesNeeded = Math.ceil(totalCount / backendPageSize);

            if (totalPagesNeeded > 1) {
                console.log(`[AgenceStore] Fetching ${totalPagesNeeded - 1} more pages in parallel...`);
                console.time("[AgenceStore] Parallel Pages Fetch");
                const pageRequests = [];
                for (let p = 2; p <= totalPagesNeeded; p++) {
                    pageRequests.push(agencesApi.getAgences({ ...params, page: p, page_size: 20 }));
                }

                const subsequentResponses = await Promise.all(pageRequests);
                subsequentResponses.forEach(res => {
                    allAgences = [...allAgences, ...res.results];
                });
                console.timeEnd("[AgenceStore] Parallel Pages Fetch");
            }

            console.log(`[AgenceStore] Loaded ${allAgences.length}/${totalCount} agences.`);
            set({
                agences: allAgences,
                totalCount: totalCount,
                isLoading: false,
                lastFetched: Date.now(),
            });
        } catch (error: any) {
            console.error("[AgenceStore] Error:", error);
            const statusCode = error?.response?.status;
            set({
                error: error?.message || "Erreur lors du chargement des agences",
                isLoading: false,
            });
            // Don't show toast for permission errors (403/401)
            if (statusCode !== 403 && statusCode !== 401) {
                toast.error("Erreur lors du chargement des agences");
            }
        } finally {
            console.timeEnd("[AgenceStore] Total Fetch Time");
        }
    },

    fetchAgence: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const agence = await agencesApi.getAgence(id);
            set({ currentAgence: agence, isLoading: false });
        } catch (error: any) {
            set({
                error: error?.message || "Erreur lors du chargement de l'agence",
                isLoading: false,
            });
            toast.error("Erreur lors du chargement de l'agence");
        }
    },

    createAgence: async (data: AgenceCreateData) => {
        set({ isLoading: true, error: null });
        try {
            const newAgence = await agencesApi.createAgence(data);

            // Update local state if it's the first page or simplistic add
            set((state) => ({
                agences: [newAgence, ...state.agences],
                totalCount: state.totalCount + 1,
                isLoading: false,
            }));

            toast.success("Agence créée avec succès");
            return newAgence;
        } catch (error: any) {
            set({
                error: error?.message || "Erreur lors de la création de l'agence",
                isLoading: false,
            });
            toast.error("Erreur lors de la création de l'agence");
            throw error;
        }
    },

    updateAgence: async (id: string, data: AgenceUpdateData) => {
        set({ isLoading: true, error: null });
        try {
            const updatedAgence = await agencesApi.updateAgence(id, data);

            set((state) => ({
                agences: state.agences.map((a) => (a.id === id ? updatedAgence : a)),
                currentAgence: state.currentAgence?.id === id ? updatedAgence : state.currentAgence,
                isLoading: false,
            }));

            toast.success("Agence mise à jour avec succès");
            return updatedAgence;
        } catch (error: any) {
            set({
                error: error?.message || "Erreur lors de la modification de l'agence",
                isLoading: false,
            });
            toast.error("Erreur lors de la modification de l'agence");
            throw error;
        }
    },

    deleteAgence: async (id: string) => {
        set({ isLoading: true, error: null });
        const deletedAgence = get().agences.find((a) => a.id === id);
        try {
            // Optimistic remove for better UI feel? Or standard wait?
            // Let's do standard wait to be safe as per store pattern
            await agencesApi.deleteAgence(id);

            set((state) => ({
                agences: state.agences.filter((a) => a.id !== id),
                totalCount: state.totalCount - 1,
                isLoading: false,
            }));

            toast.success("Agence supprimée avec succès");
        } catch (error: any) {
            set({
                error: error?.message || "Erreur lors de la suppression de l'agence",
                isLoading: false,
            });
            toast.error("Erreur lors de la suppression de l'agence");
            throw error;
        }
    },

    reset: () => {
        set({
            agences: [],
            currentAgence: null,
            totalCount: 0,
            isLoading: false,
            error: null,
        });
    },
}));
