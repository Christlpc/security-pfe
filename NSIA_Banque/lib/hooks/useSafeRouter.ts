"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function useSafeRouter() {
  const router = useNextRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const push = useCallback(
    (href: string) => {
      if (!isMounted) return;
      try {
        router.push(href);
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [router, isMounted]
  );

  const back = useCallback(() => {
    if (!isMounted) return;
    try {
      router.back();
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [router, isMounted]);

  const replace = useCallback(
    (href: string) => {
      if (!isMounted) return;
      try {
        router.replace(href);
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [router, isMounted]
  );

  return {
    push,
    back,
    replace,
    isReady: isMounted,
  };
}




