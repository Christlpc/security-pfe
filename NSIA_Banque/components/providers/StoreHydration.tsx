"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useSession, signIn } from "next-auth/react";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function StoreHydration({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  // Synchronisation de la session NextAuth avec le store Zustand
  useEffect(() => {
    if (status === "authenticated" && session) {
      setTokens({
        access: (session as any).accessToken || "",
        refresh: (session as any).refreshToken || "",
      });
      setUser(session.user as any);
    } else if (status === "unauthenticated") {
      setTokens(null);
      setUser(null);
    }
  }, [session, status, setTokens, setUser]);

  useEffect(() => {
    if (typeof window !== "undefined" && status !== "loading") {
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
      const { isAuthenticated } = useAuthStore.getState();

      if (status === "unauthenticated" && !isPublicRoute) {
        console.log("[StoreHydration] Not authenticated, redirecting to local login page...");
        router.push("/login");
      }
    }
  }, [pathname, router, status]);

  // Afficher les enfants immédiatement
  return <>{children}</>;
}

