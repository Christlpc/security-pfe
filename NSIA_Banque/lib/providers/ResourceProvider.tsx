"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { banqueApi } from '@/lib/api/banques';
import { agencesApi } from '@/lib/api/agences';
import { useAuthStore } from '@/lib/store/authStore';
import { ROLES } from '@/lib/utils/constants';
import type { Banque, Agence } from '@/types';

// Cache keys for localStorage persistence
const CACHE_KEYS = {
    BANQUES: 'nsia_cache_banques',
    AGENCES: 'nsia_cache_agences',
    CACHE_TIMESTAMP: 'nsia_cache_timestamp',
};

// Cache expiry time: 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

interface ResourceCacheContextType {
    // Cached data
    banques: Banque[];
    agences: Agence[];

    // Loading states
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    refreshCache: () => Promise<void>;
    getAgencesByBanque: (banqueId: string | number) => Agence[];
    clearCache: () => void;
}

const ResourceCacheContext = createContext<ResourceCacheContextType | null>(null);

// Helper to safely parse JSON from localStorage
function safeParseJSON<T>(key: string, fallback: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

// Helper to check if cache is still valid
function isCacheValid(): boolean {
    try {
        const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
        if (!timestamp) return false;
        const cacheTime = parseInt(timestamp, 10);
        return Date.now() - cacheTime < CACHE_EXPIRY_MS;
    } catch {
        return false;
    }
}

interface ResourceProviderProps {
    children: ReactNode;
}

export function ResourceProvider({ children }: ResourceProviderProps) {
    const [banques, setBanques] = useState<Banque[]>([]);
    const [agences, setAgences] = useState<Agence[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Try to load from cache first
        if (isCacheValid()) {
            const cachedBanques = safeParseJSON<Banque[]>(CACHE_KEYS.BANQUES, []);
            const cachedAgences = safeParseJSON<Agence[]>(CACHE_KEYS.AGENCES, []);

            if (cachedBanques.length > 0) {
                setBanques(cachedBanques);
                setAgences(cachedAgences);
                setIsInitialized(true);
                console.log('[ResourceCache] Loaded from cache:', cachedBanques.length, 'banques,', cachedAgences.length, 'agences');
                return;
            }
        }

        // Cache invalid or empty, fetch fresh data
        refreshCache();
    }, []);

    const refreshCache = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        console.log('[ResourceCache] Refreshing cache...');

        try {
            // Fetch all resources in parallel only if authenticated AND admin
            const { isAuthenticated, user } = useAuthStore.getState();
            if (!isAuthenticated) {
                console.log('[ResourceCache] Skip: user not authenticated');
                setIsInitialized(true);
                return;
            }

            // Check permissions - strictly block non-admins from trying to fetch full lists
            // This prevents 403 errors for Gestionnaires/Responsables
            const isAdmin = user?.role === ROLES.SUPER_ADMIN_NSIA || user?.role === ROLES.ADMIN_NSIA;

            if (!isAdmin) {
                console.log('[ResourceCache] Skip: user is not admin, skipping global resource fetch');
                setIsInitialized(true);
                return;
            }

            const [banquesRes, agencesRes] = await Promise.all([
                banqueApi.getBanques(),
                agencesApi.getAgences({ page_size: 200 }),
            ]);

            const newBanques = banquesRes.results;
            const newAgences = agencesRes.results;

            // Update state
            setBanques(newBanques);
            setAgences(newAgences);

            // Persist to localStorage
            localStorage.setItem(CACHE_KEYS.BANQUES, JSON.stringify(newBanques));
            localStorage.setItem(CACHE_KEYS.AGENCES, JSON.stringify(newAgences));
            localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());

            console.log('[ResourceCache] Cache refreshed:', newBanques.length, 'banques,', newAgences.length, 'agences');
        } catch (error) {
            console.error('[ResourceCache] Error refreshing cache:', error);
        } finally {
            setIsLoading(false);
            setIsInitialized(true);
        }
    }, [isLoading]);

    const getAgencesByBanque = useCallback((banqueId: string | number): Agence[] => {
        return agences.filter(a => String(a.banque) === String(banqueId));
    }, [agences]);

    const clearCache = useCallback(() => {
        localStorage.removeItem(CACHE_KEYS.BANQUES);
        localStorage.removeItem(CACHE_KEYS.AGENCES);
        localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
        setBanques([]);
        setAgences([]);
        setIsInitialized(false);
    }, []);

    return (
        <ResourceCacheContext.Provider
            value={{
                banques,
                agences,
                isLoading,
                isInitialized,
                refreshCache,
                getAgencesByBanque,
                clearCache,
            }}
        >
            <AuthFetchListener onAuthChange={refreshCache} />
            {children}
        </ResourceCacheContext.Provider>
    );
}

// Sub-component to listen for auth changes and trigger refresh
function AuthFetchListener({ onAuthChange }: { onAuthChange: () => void }) {
    const isAuthenticated = useAuthStore((state: { isAuthenticated: boolean }) => state.isAuthenticated);
    const lastAuth = useRef(isAuthenticated);

    useEffect(() => {
        if (isAuthenticated && !lastAuth.current) {
            console.log('[ResourceCache] Auth detected, refreshing...');
            onAuthChange();
        }
        lastAuth.current = isAuthenticated;
    }, [isAuthenticated, onAuthChange]);

    return null;
}

// Hook to access cached resources
export function useResourceCache() {
    const context = useContext(ResourceCacheContext);
    if (!context) {
        throw new Error('useResourceCache must be used within a ResourceProvider');
    }
    return context;
}

// Convenience hooks for specific resources
export function useBanques() {
    const { banques, isLoading, refreshCache } = useResourceCache();
    return { banques, isLoading, refresh: refreshCache };
}

export function useAgences(banqueId?: string | number) {
    const { agences, getAgencesByBanque, isLoading } = useResourceCache();

    if (banqueId) {
        return { agences: getAgencesByBanque(banqueId), isLoading };
    }

    return { agences, isLoading };
}
