"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const pathname = usePathname();
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

  // Gérer la redirection séparément
  useEffect(() => {
    if (!isMounted || !router.isReady) return;
    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthenticated, pathname, router, isMounted]);

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-16"
          }`}
        >
          <Header />
          <main className="p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </ProtectedRoute>
  );
}

