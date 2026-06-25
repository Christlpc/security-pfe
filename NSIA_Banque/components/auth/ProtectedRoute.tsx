"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const router = useSafeRouter();
  const [isMounted, setIsMounted] = useState(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Vérifier l'authentification une seule fois au montage
  useEffect(() => {
    if (!isMounted || !router.isReady || hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    checkAuth();
  }, [isMounted, router.isReady, checkAuth]);

  // Gérer les redirections séparément
  useEffect(() => {
    if (!isMounted || !router.isReady) return;
    
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push("/");
    }
  }, [isAuthenticated, user, allowedRoles, router, isMounted]);

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

