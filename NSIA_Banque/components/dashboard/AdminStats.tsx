"use client";

import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { Users, Building2, FileText, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { AdminCharts } from "./AdminCharts";
import { PRODUIT_LABELS } from "@/types";
import { useAuthStore } from "@/lib/store/authStore";
import { useAgenceStore } from "@/lib/store/agenceStore";
import { ROLES, STATUT_LABELS } from "@/lib/utils/constants";

export function AdminStats() {
    const { user } = useAuthStore();
    const { banques, fetchBanques } = useBanqueStore();
    const { simulations, fetchSimulations } = useSimulationStore();
    const { agences, fetchAgences } = useAgenceStore();

    const isResponsableBanque = user?.role === ROLES.RESPONSABLE_BANQUE;

    useEffect(() => {
        fetchBanques();
        fetchSimulations({ page_size: 1000 } as any);
        if (isResponsableBanque) {
            fetchAgences();
        }
    }, [fetchBanques, fetchSimulations, fetchAgences, isResponsableBanque]);

    // --- Data Aggregation ---

    // 1. By Bank (for NSIA Admins)
    const statsByBank = useMemo(() => {
        const counts: Record<string, number> = {};
        simulations.forEach(sim => {
            const bankId = String(sim.banque);
            counts[bankId] = (counts[bankId] || 0) + 1;
        });

        return banques.map(b => ({
            name: b.code || b.nom,
            value: counts[String(b.id)] || 0,
            color: b.couleur_primaire || "#3b82f6"
        })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [simulations, banques]);

    // 1b. By Agency (for Responsable Banque)
    const statsByAgency = useMemo(() => {
        const counts: Record<string, number> = {};
        simulations.forEach(sim => {
            const agenceName = sim.agence_nom || "Sans Agence";
            counts[agenceName] = (counts[agenceName] || 0) + 1;
        });

        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
        return Object.entries(counts).map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
        })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [simulations]);

    // 2. By Product
    const statsByProduct = useMemo(() => {
        const counts: Record<string, number> = {};
        simulations.forEach(sim => {
            counts[sim.produit] = (counts[sim.produit] || 0) + 1;
        });

        return Object.entries(counts).map(([key, value]) => ({
            name: PRODUIT_LABELS[key as keyof typeof PRODUIT_LABELS] || key,
            value
        })).sort((a, b) => b.value - a.value);
    }, [simulations]);

    // 3. By Status
    const statsByStatus = useMemo(() => {
        const counts: Record<string, number> = {};
        simulations.forEach(sim => {
            counts[sim.statut] = (counts[sim.statut] || 0) + 1;
        });

        const statusMap: Record<string, string> = {
            brouillon: "Brouillon",
            calculee: "Calculée",
            validee: "Validée",
            convertie: "Convertie"
        };

        return Object.entries(counts).map(([key, value]) => ({
            name: statusMap[key] || key,
            value
        }));
    }, [simulations]);

    // Summary Metrics
    const totalSimulations = simulations.length;
    const totalBanques = banques.length;
    const totalAgences = agences.length;

    const avgSimulations = totalBanques > 0 ? Math.round(totalSimulations / totalBanques) : 0;
    const avgSimulationsPerAgency = totalAgences > 0 ? Math.round(totalSimulations / totalAgences) : 0;

    const conversionRate = totalSimulations > 0
        ? Math.round((simulations.filter(s => s.statut === "convertie").length / totalSimulations) * 100)
        : 0;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Banques / Agences */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                                {isResponsableBanque ? "Agences Actives" : "Banques Partenaires"}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900">
                                {isResponsableBanque ? totalAgences : totalBanques}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {isResponsableBanque ? "Agences de réseau actives" : "Banques de réseau partenaires"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Simulations */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Simulations</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900">{totalSimulations}</h3>
                            <p className="text-xs text-slate-500 mt-1">Dossiers simulés</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Moyenne */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                                {isResponsableBanque ? "Moyenne / Agence" : "Moyenne / Banque"}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900">
                                {isResponsableBanque ? avgSimulationsPerAgency : avgSimulations}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {isResponsableBanque ? "Simulations par agence" : "Simulations par banque"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Conversion */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Taux de Conversion</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900">{conversionRate}%</h3>
                            <p className="text-xs text-slate-500 mt-1">Simulations converties</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Component */}
            <AdminCharts
                dataByBank={isResponsableBanque ? statsByAgency : statsByBank}
                dataByProduct={statsByProduct}
                dataByStatus={statsByStatus}
                mainChartTitle={isResponsableBanque ? "Volume de Simulations par Agence (Top 5)" : "Volume de Simulations par Banque (Top 5)"}
            />
        </div>
    );
}
