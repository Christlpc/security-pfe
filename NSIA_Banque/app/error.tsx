"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useSafeRouter();

  useEffect(() => {
    // Log l'erreur (vous pouvez intégrer Sentry, LogRocket, etc. ici)
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-0 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Une erreur est survenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Désolé, une erreur inattendue s&apos;est produite. Veuillez réessayer ou
              retourner à la page d&apos;accueil.
            </p>
            {error.message && (
              <div className="bg-gray-100 rounded-lg p-4 text-left">
                <p className="text-sm font-semibold text-gray-700 mb-2">Message d&apos;erreur :</p>
                <p className="text-sm text-red-600 font-mono break-all">{error.message}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Home className="h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Stack trace (développement uniquement)
              </summary>
              <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




