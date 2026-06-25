"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUIT_LABELS } from "@/types";
import type { BankTheme } from "@/lib/utils/theme";
import { Button } from "@/components/ui/button";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { ArrowUpRight } from "lucide-react";

interface ProductOverviewProps {
  theme: BankTheme;
}

export function ProductOverview({ theme }: ProductOverviewProps) {
  const { user } = useAuthStore();
  const router = useSafeRouter();
  const produits = (user?.banque?.produits_disponibles || []).filter(p => p !== 'confort_etudes');

  return (
    <Card className="border-0 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-xl font-bold text-gray-900">Assurances Disponibles</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto min-h-0 pr-2">
        <div className="space-y-2">
          {produits.map((produit) => (
            <div
              key={produit}
              className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white"
              onClick={() => router.push(`/simulations/new?produit=${produit}`)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${theme.accent.replace("text", "bg")} shadow-sm`} />
                <span className="font-semibold text-sm text-gray-900">{PRODUIT_LABELS[produit]}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
