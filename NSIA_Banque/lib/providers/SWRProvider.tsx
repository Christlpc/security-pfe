"use client";

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

// Global SWR configuration for optimal caching
const swrConfig = {
    // Don't refetch on window focus - reduces unnecessary API calls
    revalidateOnFocus: false,

    // Don't refetch when reconnecting
    revalidateOnReconnect: false,

    // Dedupe requests within 60 seconds
    dedupingInterval: 60000,

    // Cache data for 5 minutes before considering stale
    focusThrottleInterval: 300000,

    // Retry failed requests 3 times
    errorRetryCount: 3,

    // Exponential backoff for retries
    errorRetryInterval: 5000,

    // Keep previous data while revalidating
    keepPreviousData: true,

    // Custom fetcher with error handling
    fetcher: async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) {
            const error = new Error('An error occurred while fetching the data.');
            throw error;
        }
        return res.json();
    },
};

interface SWRProviderProps {
    children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig value={swrConfig}>
            {children}
        </SWRConfig>
    );
}

export default SWRProvider;
