"use client";

import { useEffect } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/utils/constants";
import { PRODUIT_LABELS } from "@/types";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { formatDateShort, formatDateRelative } from "@/lib/utils/date";
import { Clock, ArrowUp, ArrowDown, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export function RecentActivity() {
  const router = useSafeRouter();
  const { simulations, fetchSimulations } = useSimulationStore();
  const { getLabel } = useProductLabels();

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const recentSimulations = simulations
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const getStatusConfig = (statut: string) => {
    switch (statut) {
      case "validee":
      case "convertie":
        return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" };
      case "calculee":
        return { icon: FileText, color: "text-blue-600", bg: "bg-blue-100" };
      default:
        return { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" };
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Card className="border-0">
      <CardHeader className="pb-4 pt-6 px-6 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">Activité Récente Globale</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Dernières simulations mises à jour sur la plateforme</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
            onClick={() => router.push('/simulations')}
          >
            Voir tout
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recentSimulations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 m-6 rounded-xl border border-dashed border-gray-200">
            <Clock className="mx-auto h-8 w-8 text-gray-400 mb-3" strokeWidth={1.5} />
            <p className="text-gray-900 font-medium">Aucune activité récente</p>
            <p className="text-sm text-gray-500 mt-1">Les nouvelles simulations apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead className="font-semibold text-gray-700 px-6 py-3">Client</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3">Produit</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3">Montant / Capital</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3">Dernière Modification</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSimulations.map((simulation) => {
                  const amt = simulation.montant_pret || simulation.capital_garanti || simulation.rente_annuelle;
                  return (
                    <TableRow 
                      key={simulation.id} 
                      className="hover:bg-slate-50/40 transition-colors cursor-pointer border-b border-gray-100 last:border-0"
                      onClick={() => router.push(`/simulations/${simulation.id}`)}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {simulation.prenom_client} {simulation.nom_client}
                        </div>
                        <div className="text-xs text-gray-400">{simulation.reference || "Pas de réf."}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-blue-600/80" />
                          {getLabel(simulation.produit)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-gray-900">
                        {amt ? formatCurrency(amt) : simulation.prime_totale ? `${simulation.prime_totale} FCFA` : "-"}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-500">
                        {formatDateRelative(simulation.updated_at)}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${STATUT_COLORS[simulation.statut]} text-[11px] px-2.5 py-1 border-0 font-medium rounded-full shadow-sm`}>
                          {STATUT_LABELS[simulation.statut]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
