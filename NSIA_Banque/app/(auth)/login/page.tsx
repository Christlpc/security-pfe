"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useSafeRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Redirection directe vers Keycloak (realm BANK_ECOBANK)
      signIn("keycloak", { callbackUrl: "/" });
    } else if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600 text-lg font-medium">
        Redirection vers l&apos;authentification sécurisée...
      </p>
      <p className="text-gray-400 text-sm mt-2">
        Vous allez être redirigé vers la page de connexion Keycloak
      </p>
    </div>
  );
}
