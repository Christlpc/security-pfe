"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { MockDataIndicator } from "@/components/dev/MockDataIndicator";
import { StoreHydration } from "@/components/providers/StoreHydration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SWRProvider } from "@/lib/providers/SWRProvider";
import { ResourceProvider } from "@/lib/providers/ResourceProvider";
import { SessionProvider } from "next-auth/react";


export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <SWRProvider>
            <ResourceProvider>
              <StoreHydration>
                {children}
                <MockDataIndicator />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: "#363636",
                      color: "#fff",
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: "#10b981",
                        secondary: "#fff",
                      },
                    },
                    error: {
                      duration: 4000,
                      iconTheme: {
                        primary: "#ef4444",
                        secondary: "#fff",
                      },
                    },
                  }}
                />
              </StoreHydration>
            </ResourceProvider>
          </SWRProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

