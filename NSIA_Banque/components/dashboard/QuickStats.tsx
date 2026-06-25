"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { historiqueApi, type DashboardData } from "@/lib/api/simulations/historique";
import type { BankTheme } from "@/lib/utils/theme";
import {
  TrendingUp,
  TrendingDown,
  FileEdit,
  Calculator,
  FileCheck,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface QuickStatsProps {
  theme: BankTheme;
}

export function QuickStats({ theme }: QuickStatsProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await historiqueApi.getDashboard();
        setDashboard(data);
      } catch (error) {
        console.error("Erreur chargement dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-gray-200 bg-gray-50 animate-pulse">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="w-14 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="w-16 h-8 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboard) return null;

  const statsCards = [
    {
      label: "Brouillon",
      data: dashboard.by_status.brouillon,
      icon: FileEdit,
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      textColor: "text-slate-700",
      iconBg: "bg-slate-100",
      description: "En cours de saisie",
    },
    {
      label: "Calculée",
      data: dashboard.by_status.calculee,
      icon: Calculator,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      iconBg: "bg-blue-100",
      description: "Simulation effectuée",
    },
    {
      label: "Proposition",
      data: dashboard.by_status.validee,
      icon: FileCheck,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      iconBg: "bg-amber-100",
      description: "En attente de validation",
    },
    {
      label: "Contrat",
      data: dashboard.by_status.convertie,
      icon: ShieldCheck,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      iconBg: "bg-green-100",
      description: "Converti en contrat",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        const evolution = stat.data.evolution;
        const trend = evolution >= 0 ? "up" : "down";

        return (
          <Card
            key={stat.label}
            className={`border ${stat.borderColor} ${stat.bgColor} hover:shadow-md transition-all duration-300 group cursor-pointer overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]`}
          >
            <CardContent className="p-5 relative z-10">
              {/* Header: Trend only */}
              <div className="flex items-center justify-end mb-4">
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    trend === "up"
                      ? "text-green-600 bg-green-50"
                      : "text-red-600 bg-red-50"
                  }`}
                >
                  {trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{evolution >= 0 ? "+" : ""}{evolution}%</span>
                </div>
              </div>

              {/* Value */}
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.data.count}</p>
                <p className={`text-sm font-semibold ${stat.textColor}`}>{stat.label}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>

              {/* Sous-détail mois courant */}
              <div className="mt-3 pt-3 border-t border-gray-100/80 flex items-center justify-between text-xs text-gray-500">
                <span>Ce mois</span>
                <span className="font-semibold text-gray-700">{stat.data.current_month}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
