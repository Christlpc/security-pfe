import { create } from "zustand";
import type { User, UserRole } from "@/types";
import type { UserCreateData, UserUpdateData, UserFilters } from "@/lib/api/users";
import type { PaginatedResponse } from "@/types";
import { userApi } from "@/lib/api/users";
import { useNotificationStore } from "@/lib/store/notificationStore";
import toast from "react-hot-toast";

interface UserStore {
  users: User[];
  currentUser: User | null;
  totalCount: number;
  filters: UserFilters;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last fetch

  // Actions
  fetchUsers: (filters?: UserFilters, force?: boolean) => Promise<void>;
  fetchUser: (id: number | string) => Promise<void>;
  createUser: (data: UserCreateData) => Promise<User>;
  updateUser: (id: number | string, data: UserUpdateData) => Promise<User>;
  deleteUser: (id: number | string) => Promise<void>;
  activateUser: (id: number | string) => Promise<void>;
  deactivateUser: (id: number | string) => Promise<void>;
  setFilters: (filters: UserFilters) => void;
  reset: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds cache

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  currentUser: null,
  totalCount: 0,
  filters: { page: 1, page_size: 1000 },
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchUsers: async (filters?: UserFilters, force = false) => {
    const state = get();
    // Cache check
    if (!force && state.lastFetched && (Date.now() - state.lastFetched < CACHE_DURATION)) {
      return;
    }

    set({ isLoading: true, error: null });
    console.time("[UserStore] Total Fetch Time");
    try {
      // 1. Fetch first page (using 20 to match backend behavior)
      console.time("[UserStore] First Page Fetch");
      const firstResponse = await userApi.getUsers({
        page: 1,
        page_size: 20
      });
      console.timeEnd("[UserStore] First Page Fetch");

      let allUsers = [...firstResponse.results];
      const totalCount = firstResponse.count;

      // Determine how many pages are left
      const backendPageSize = firstResponse.results.length || 20;
      const totalPagesNeeded = Math.ceil(totalCount / backendPageSize);

      if (totalPagesNeeded > 1) {
        console.log(`[UserStore] Fetching ${totalPagesNeeded - 1} more pages in parallel...`);
        console.time("[UserStore] Parallel Pages Fetch");
        const pageRequests = [];
        for (let p = 2; p <= totalPagesNeeded; p++) {
          pageRequests.push(userApi.getUsers({ page: p, page_size: 20 }));
        }

        const subsequentResponses = await Promise.all(pageRequests);
        subsequentResponses.forEach(res => {
          allUsers = [...allUsers, ...res.results];
        });
        console.timeEnd("[UserStore] Parallel Pages Fetch");
      }

      console.log(`[UserStore] Loaded ${allUsers.length}/${totalCount} users.`);
      set({
        users: allUsers,
        totalCount: totalCount,
        filters: filters || state.filters,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error: any) {
      console.error("[UserStore] Fetch Error:", error);
      set({
        error: error?.message || "Erreur lors du chargement des utilisateurs",
        isLoading: false,
      });
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      console.timeEnd("[UserStore] Total Fetch Time");
    }
  },

  fetchUser: async (id: number | string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await userApi.getUser(id);
      set({ currentUser: user, isLoading: false });
    } catch (error: any) {
      set({
        error: error?.message || "Erreur lors du chargement de l'utilisateur",
        isLoading: false,
      });
      toast.error("Erreur lors du chargement de l'utilisateur");
    }
  },

  createUser: async (data: UserCreateData) => {
    set({ isLoading: true, error: null });
    try {
      // Optimistic update
      const tempUser: User = {
        id: Date.now(), // ID temporaire
        email: data.email,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role,
        banque: data.banque ? {
          id: data.banque,
          code: "",
          nom: "",
          produits_disponibles: [],
        } : null,
      };
      set((state) => ({
        users: [tempUser, ...state.users],
        totalCount: state.totalCount + 1,
      }));

      const newUser = await userApi.createUser(data);

      // Remplacer par les vraies données
      set((state) => ({
        users: state.users.map((u) => (u.id === tempUser.id ? newUser : u)),
        isLoading: false,
      }));

      toast.success("Utilisateur créé avec succès");

      // Notification
      useNotificationStore.getState().addNotification({
        type: "user",
        priority: "low",
        title: "Nouvel utilisateur créé",
        message: `L'utilisateur ${newUser.prenom} ${newUser.nom} a été créé avec succès`,
        action_url: "/users",
        action_label: "Voir les utilisateurs",
        metadata: { user_id: newUser.id as any },
      });

      return newUser;
    } catch (error: any) {
      // Rollback
      set((state) => ({
        users: state.users.filter((u) => u.id !== Date.now()),
        totalCount: state.totalCount - 1,
        error: error?.message || "Erreur lors de la création",
        isLoading: false,
      }));
      toast.error(error?.message || "Erreur lors de la création");
      throw error;
    }
  },

  updateUser: async (id: number | string, data: UserUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      // Optimistic update
      const oldUser = get().users.find((u) => u.id === id);
      if (oldUser) {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id
              ? {
                ...u,
                ...data,
                banque: data.banque
                  ? {
                    id: data.banque,
                    code: "",
                    nom: "",
                    produits_disponibles: [],
                  }
                  : u.banque,
              }
              : u
          ),
        }));
      }

      const updatedUser = await userApi.updateUser(id, data);

      // Remplacer par les vraies données
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? updatedUser : u)),
        currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
        isLoading: false,
      }));

      toast.success("Utilisateur modifié avec succès");
      return updatedUser;
    } catch (error: any) {
      // Rollback
      const oldUser = get().users.find((u) => u.id === id);
      if (oldUser) {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? oldUser : u)),
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

  deleteUser: async (id: number | string) => {
    set({ isLoading: true, error: null });
    // Optimistic update - sauvegarder l'utilisateur avant suppression
    const deletedUser = get().users.find((u) => u.id === id);
    try {
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        totalCount: state.totalCount - 1,
      }));

      await userApi.deleteUser(id);
      set({ isLoading: false });
      toast.success("Utilisateur supprimé avec succès");
    } catch (error: any) {
      // Rollback
      if (deletedUser) {
        set((state) => ({
          users: [...state.users, deletedUser].sort((a, b) => {
            const idA = a.id;
            const idB = b.id;
            if (typeof idA === 'string' && typeof idB === 'string') return idA.localeCompare(idB);
            if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
            return String(idA).localeCompare(String(idB));
          }),
          totalCount: state.totalCount + 1,
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

  activateUser: async (id: number | string) => {
    try {
      await userApi.activateUser(id);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, is_active: true } : u)),
      }));
      toast.success("Utilisateur activé");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'activation");
      throw error;
    }
  },

  deactivateUser: async (id: number | string) => {
    try {
      await userApi.deactivateUser(id);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, is_active: false } : u)),
      }));
      toast.success("Utilisateur désactivé");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la désactivation");
      throw error;
    }
  },

  setFilters: (filters: UserFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  reset: () => {
    set({
      users: [],
      currentUser: null,
      totalCount: 0,
      filters: { page: 1, page_size: 10 },
      isLoading: false,
      error: null,
    });
  },
}));

