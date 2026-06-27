"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { SimulationDetail } from "@/components/simulations/SimulationDetail";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Chargement de la simulation…</p>
      </div>
    );
  }

  if (!currentSimulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-gray-400">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🔍</div>
        <p className="text-base font-medium text-gray-500">Simulation introuvable</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/simulations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux simulations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium page header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/simulations")}
          className="mt-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Simulation{" "}
            <span className="text-indigo-600">{currentSimulation.reference}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {currentSimulation.prenom_client} {currentSimulation.nom_client}
          </p>
        </div>
      </div>

      <SimulationDetail simulation={currentSimulation} />
    </div>
  );
}
