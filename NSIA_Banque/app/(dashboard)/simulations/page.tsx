"use client";
 
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FileEdit, FileText, ShieldCheck, Download, FileSpreadsheet, BarChart3 } from "lucide-react";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ExportStatsDialog } from "@/components/simulations/ExportStatsDialog";
 
// Lazy load the heavy SimulationTable component
const SimulationTable = dynamic(
  () => import("@/components/simulations/SimulationTable").then(mod => ({ default: mod.SimulationTable })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-white rounded-[24px] border border-gray-100 shadow-sm">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Chargement des simulations...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);
 
export default function SimulationsPage() {
  const router = useRouter();
  const { simulations, fetchSimulations, exportSimulations } = useSimulationStore();
  const [showStatsDialog, setShowStatsDialog] = useState(false);
 
  useEffect(() => {
    fetchSimulations({ page: 1, page_size: 500 } as any);
  }, [fetchSimulations]);
 
  // Compute simulation counts
  const total = simulations.length;
  const brouillons = simulations.filter(s => s.statut === "brouillon").length;
  const propositions = simulations.filter(s => s.statut === "validee" || s.statut === "proposition").length;
  const contrats = simulations.filter(s => s.statut === "convertie").length;
 
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Gestion des Simulations</h1>
          <p className="text-gray-500 mt-1 text-sm">Visualisation et traitement des propositions de contrat d'assurance</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl border-slate-200/80 hover:bg-slate-50 font-semibold h-10 px-4">
                <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-lg border border-slate-100 bg-white z-50">
              <DropdownMenuItem onClick={() => exportSimulations('csv', {})} className="rounded-lg cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                Exporter en XLSX
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowStatsDialog(true)} className="rounded-lg cursor-pointer">
                <BarChart3 className="mr-2 h-4 w-4 text-purple-600" />
                Voir les statistiques
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={() => router.push("/simulations/new")}
            className="rounded-xl bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white hover:opacity-90 transition-all font-semibold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Nouvelle Simulation
          </Button>
        </div>
      </div>
 
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total */}
        <Card className="border-0 rounded-[24px] overflow-hidden relative group shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Simulations Total</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{total}</p>
              <p className="text-xs text-slate-500 mt-1">Simulations enregistrées</p>
            </div>
          </CardContent>
        </Card>
 
        {/* Brouillons */}
        <Card className="border-0 rounded-[24px] overflow-hidden relative group shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Brouillons</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{brouillons}</p>
              <p className="text-xs text-slate-500 mt-1">En cours de rédaction</p>
            </div>
          </CardContent>
        </Card>
 
        {/* Propositions (Validation) */}
        <Card className="border-0 rounded-[24px] overflow-hidden relative group shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Propositions</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{propositions}</p>
              <p className="text-xs text-slate-500 mt-1">En attente de signature</p>
            </div>
          </CardContent>
        </Card>
 
        {/* Contrats */}
        <Card className="border-0 rounded-[24px] overflow-hidden relative group shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Contrats Validés</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{contrats}</p>
              <p className="text-xs text-slate-500 mt-1">Convertis avec succès</p>
            </div>
          </CardContent>
        </Card>
      </div>
 
      <SimulationTable />

      <ExportStatsDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        filters={{}}
      />
    </div>
  );
}
