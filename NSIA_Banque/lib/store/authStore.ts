import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, LoginCredentials, AuthResponse } from "@/types";
import { authApi } from "@/lib/api/auth";
import { isTokenExpired } from "@/lib/utils/jwt";
import { signIn, signOut } from "next-auth/react";

// Storage sécurisé pour SSR
const getStorage = () => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
    };
  }
  return localStorage;
};

interface AuthStore {
  user: User | null;
  tokens: { access: string; refresh: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials?: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: { access: string; refresh: string } | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials?: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          await signIn("keycloak", { callbackUrl: "/" });
          set({ isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: "Erreur lors de la redirection vers Keycloak",
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });

        // Reset simulation store to prevent data persistence between users
        // Use dynamic import to avoid circular dependency
        import("@/lib/store/simulationStore").then(({ useSimulationStore }) => {
          useSimulationStore.getState().reset();
          useSimulationStore.getState().resetWizard();
        }).catch(err => console.error("Failed to reset simulation store:", err));

        // Déconnexion de NextAuth
        signOut({ callbackUrl: "/login" });
      },

      refreshToken: async (): Promise<boolean> => {
        const { tokens } = get();
        if (!tokens?.refresh) {
          get().logout();
          return false;
        }

        // Check if refresh token itself is expired
        if (isTokenExpired(tokens.refresh, 0)) {
          console.log("[Auth] Refresh token expired, logging out");
          get().logout();
          return false;
        }

        try {
          const response = await authApi.refreshToken(tokens.refresh);
          set({
            tokens: { ...tokens, access: response.access },
          });
          console.log("[Auth] Token refreshed successfully");
          return true;
        } catch (error) {
          console.error("[Auth] Token refresh failed:", error);
          get().logout();
          return false;
        }
      },

      checkAuth: async () => {
        // Ne vérifier que côté client
        if (typeof window === "undefined") return;

        const { tokens, user } = get();

        // No tokens or user = not authenticated
        if (!tokens || !user) {
          set({ isAuthenticated: false });
          return;
        }

        // Check if access token is expired
        if (isTokenExpired(tokens.access, 60)) {
          console.log("[Auth] Access token expired, attempting refresh...");

          // Try to refresh the token
          const refreshed = await get().refreshToken();

          if (!refreshed) {
            // Refresh failed, user needs to login again
            console.log("[Auth] Token refresh failed, user logged out");
            return;
          }
        }

        // Token valid, ensure isAuthenticated is true
        set({ isAuthenticated: true });
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setTokens: (tokens: { access: string; refresh: string } | null) => {
        set({ tokens, isAuthenticated: !!tokens });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: true,
    }
  )
);

