"use client";

import { useEffect } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/utils/constants";
import { PRODUIT_LABELS } from "@/types";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export function RecentSimulations() {
  const router = useSafeRouter();
  const { simulations, fetchSimulations, isLoading } = useSimulationStore();
  const { getLabel } = useProductLabels();

  useEffect(() => {
    fetchSimulations({ page: 1 });
  }, [fetchSimulations]);

  const recentSimulations = simulations.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Simulations Récentes</CardTitle>
          <Button variant="outline" onClick={() => router.push("/simulations")}>
            Voir tout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : recentSimulations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucune simulation</div>
        ) : (
          <div className="space-y-4">
            {recentSimulations.map((simulation) => (
              <div
                key={simulation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/simulations/${simulation.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {`${simulation.prenom_client || ""} ${simulation.nom_client || ""}`.trim() || "Client inconnu"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getLabel(simulation.produit)} • {simulation.reference}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={STATUT_COLORS[simulation.statut]}>
                    {STATUT_LABELS[simulation.statut]}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatDateShort(simulation.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

