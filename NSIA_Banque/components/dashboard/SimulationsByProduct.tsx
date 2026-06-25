"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { PRODUIT_LABELS } from "@/types";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function SimulationsByProduct() {
  const { simulations, fetchSimulations } = useSimulationStore();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    const productCounts = simulations.reduce((acc, sim) => {
      acc[sim.produit] = (acc[sim.produit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(productCounts)
      .map(([key, value]) => ({
        name: PRODUIT_LABELS[key as keyof typeof PRODUIT_LABELS] || key,
        value: value as number,
      }))
      .sort((a, b) => b.value - a.value);

    setData(chartData);
  }, [simulations]);

  return (
    <Card className="border-0 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-xl font-bold text-gray-900">Simulations par Produit</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
