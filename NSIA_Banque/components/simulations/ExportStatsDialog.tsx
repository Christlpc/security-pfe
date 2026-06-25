import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useEffect } from "react";
import { Loader2, PieChart, BarChart3, FileText, CheckCircle2 } from "lucide-react";
import { STATUT_LABELS, STATUT_COLORS } from "@/lib/utils/constants";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { Badge } from "@/components/ui/badge";

import { SimulationFilters } from "@/types";

interface ExportStatsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters?: Partial<SimulationFilters>;
}

export function ExportStatsDialog({ open, onOpenChange, filters }: ExportStatsDialogProps) {
    const { fetchExportStats, exportStats, isLoading } = useSimulationStore();
    const { getLabel } = useProductLabels();

    useEffect(() => {
        if (open) {
            fetchExportStats(filters);
        }
    }, [open, fetchExportStats, filters]);

    // Helper pour formater les clés (ex: "emprunteur" -> "Emprunteur")
    const formatLabel = (key: string, type: 'statut' | 'produit' | 'autre' = 'autre') => {
        if (type === 'statut') return STATUT_LABELS[key] || key;
        if (type === 'produit') return getLabel(key) || key;
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Statistiques d'export
                    </DialogTitle>
                    <DialogDescription>
                        Aperçu des données correspondantes à vos filtres actuels.
                    </DialogDescription>
                </DialogHeader>

                {isLoading && !exportStats ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-gray-500">Chargement des statistiques...</p>
                    </div>
                ) : exportStats ? (
                    <div className="grid gap-6 py-6 px-6 overflow-y-auto">
                        {/* Résumé Global */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                <FileText className="h-6 w-6 text-slate-400 mb-2" />
                                <span className="text-3xl font-bold text-slate-900">{exportStats.total_simulations || exportStats.total || 0}</span>
                                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Simulations</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
                                <span className="text-3xl font-bold text-green-700">{exportStats.total_validees || 0}</span>
                                <span className="text-xs text-green-600 uppercase tracking-wide font-medium">Validées</span>
                            </div>
                        </div>

                        {/* Répartition par Produit */}
                        {exportStats.par_produit && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <PieChart className="h-4 w-4" /> Répartition par Produit
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Object.entries(exportStats.par_produit).map(([key, count]: [string, any]) => (
                                        <div key={key} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                                            <span className="text-gray-600">{formatLabel(key, 'produit')}</span>
                                            <Badge variant="secondary">{count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Répartition par Statut */}
                        {exportStats.par_statut && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Répartition par Statut
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(exportStats.par_statut).map(([key, count]: [string, any]) => (
                                        <Badge
                                            key={key}
                                            className={`${STATUT_COLORS[key] || "bg-gray-100 text-gray-800"} flex items-center gap-2 px-3 py-1.5`}
                                        >
                                            {formatLabel(key, 'statut')}
                                            <span className="bg-white/50 px-1.5 rounded-full text-[10px] min-w-[1.25rem] text-center">
                                                {count}
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 px-6 text-gray-500">
                        Aucune donnée statistique disponible.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
