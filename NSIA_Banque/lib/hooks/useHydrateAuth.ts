"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

export function useHydrateAuth() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hydrater le store depuis localStorage
    useAuthStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  return isHydrated;
}




