"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { souscriptionsApi, type SouscriptionFilters } from "@/lib/api/simulations";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";

interface SouscriptionStatsProps {
  filters?: SouscriptionFilters;
}

export function SouscriptionStats({ filters }: SouscriptionStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    validees: 0,
    rejetees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Récupérer toutes les souscriptions pour les stats (sans pagination)
        const allResponse = await souscriptionsApi.getSouscriptions({
          page: 1,
          page_size: 1000, // Récupérer beaucoup pour avoir les stats
        });

        const total = allResponse.count;
        const en_attente = allResponse.results.filter((s) => s.statut === "en_attente").length;
        const validees = allResponse.results.filter((s) => s.statut === "validee").length;
        const rejetees = allResponse.results.filter((s) => s.statut === "rejetee").length;

        setStats({ total, en_attente, validees, rejetees });
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 bg-gray-100 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Dossiers"
        value={stats.total}
        icon={FileText}
        description="Souscriptions créées"
        color="blue"
      />
      <StatCard
        label="En Attente"
        value={stats.en_attente}
        icon={Clock}
        description="En attente de validation"
        color="amber"
      />
      <StatCard
        label="Validées"
        value={stats.validees}
        icon={CheckCircle}
        description="Dossiers finalisés"
        color="emerald"
      />
      <StatCard
        label="Rejetées"
        value={stats.rejetees}
        icon={XCircle}
        description="Dossiers refusés"
        color="red"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
  color
}: {
  label: string;
  value: number;
  icon: any;
  description: string;
  color: "blue" | "amber" | "emerald" | "red"
}) {
  const colorStyles = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", icon: "text-blue-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", icon: "text-amber-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", icon: "text-emerald-600" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", icon: "text-red-600" },
  };

  const currentStyle = colorStyles[color];

  return (
    <Card className={`border shadow-sm hover:shadow-md transition-all duration-200 ${currentStyle.border}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </div>
          <div className={`p-3 rounded-xl ${currentStyle.bg}`}>
            <Icon className={`h-6 w-6 ${currentStyle.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

