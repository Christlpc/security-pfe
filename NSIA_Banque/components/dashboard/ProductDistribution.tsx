"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { PRODUIT_LABELS } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#8b5cf6", "#ec4899"];

export function ProductDistribution() {
  const { simulations, fetchSimulations } = useSimulationStore();
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    // Calculer la répartition réelle depuis les simulations
    const distribution = simulations.reduce((acc, sim) => {
      const produitLabel = PRODUIT_LABELS[sim.produit] || sim.produit;
      if (!acc[produitLabel]) {
        acc[produitLabel] = 0;
      }
      acc[produitLabel]++;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));

    setChartData(data.length > 0 ? data : [
      { name: "Aucune simulation", value: 1 },
    ]);
  }, [simulations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par Produit</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}



