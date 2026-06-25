"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load the very heavy SimulationForm component (~3000 lines)
const SimulationForm = dynamic(
  () => import("@/components/simulations/SimulationForm").then(mod => ({ default: mod.SimulationForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Chargement du formulaire...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function NewSimulationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nouvelle Simulation</h1>
        <p className="text-gray-600 mt-2">Créez une nouvelle simulation d'assurance</p>
      </div>
      <SimulationForm />
    </div>
  );
}
