"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FileText, CheckCircle, DollarSign } from "lucide-react";
import { useSimulationStore } from "@/lib/store/simulationStore";

export function StatsCards() {
  const { simulations, fetchSimulations, isLoading } = useSimulationStore();
  const [stats, setStats] = useState({
    total: 0,
    simulations: 0,
    propositions: 0,
    evolution: 0,
    evolutionSims: 0,
    evolutionProps: 0,
  });

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    if (!simulations.length) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    // Helper counts
    let currentTotal = 0;
    let lastTotal = 0;

    let currentSims = 0;
    let lastSims = 0;

    let currentProps = 0;
    let lastProps = 0;

    simulations.forEach(s => {
      const d = new Date(s.created_at || s.updated_at || new Date());
      const m = d.getMonth();
      const y = d.getFullYear();

      const isCurrent = m === currentMonth && y === currentYear;
      const isPrevious = m === previousMonth && y === previousYear;

      if (isCurrent) {
        currentTotal++;
        if (s.statut === "brouillon" || s.statut === "calculee") currentSims++;
        if (s.statut === "validee") currentProps++;
      } else if (isPrevious) {
        lastTotal++;
        if (s.statut === "brouillon" || s.statut === "calculee") lastSims++;
        if (s.statut === "validee") lastProps++;
      }
    });

    const calculateEvolution = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    setStats({
      total: simulations.length,
      simulations: simulations.filter((s) => s.statut === "brouillon" || s.statut === "calculee").length,
      propositions: simulations.filter((s) => s.statut === "validee").length,
      evolution: calculateEvolution(currentTotal, lastTotal),
      evolutionSims: calculateEvolution(currentSims, lastSims),
      evolutionProps: calculateEvolution(currentProps, lastProps),
    });
  }, [simulations]);

  const cards = [
    {
      title: "Total Simulations",
      value: stats.total,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      evolution: stats.evolution,
    },
    {
      title: "Simulations en cours",
      value: stats.simulations,
      icon: FileText,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      evolution: stats.evolutionSims,
    },
    {
      title: "Propositions validées",
      value: stats.propositions,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      evolution: stats.evolutionProps,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.evolution !== undefined && (
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  {card.evolution >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span>{Math.abs(card.evolution)}% vs mois précédent</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

