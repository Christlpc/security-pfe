"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { SimulationDetail } from "@/components/simulations/SimulationDetail";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SimulationDetailPage() {
  const params = useParams();
  const router = useSafeRouter();
  const { currentSimulation, fetchSimulation, isLoading } = useSimulationStore();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchSimulation(id);
    }
  }, [id, fetchSimulation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!currentSimulation) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Simulation introuvable</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/simulations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Simulation {currentSimulation.reference}
          </h1>
          <p className="text-gray-600 mt-2">
            {currentSimulation.prenom_client} {currentSimulation.nom_client}
          </p>
        </div>
      </div>
      <SimulationDetail simulation={currentSimulation} />
    </div>
  );
}

