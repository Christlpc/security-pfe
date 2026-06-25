"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useAuthStore } from "@/lib/store/authStore";
import { getBankTheme } from "@/lib/utils/theme";
import { formatDateMonthShort } from "@/lib/utils/date";

export function ConversionChart() {
  const { simulations, fetchSimulations } = useSimulationStore();
  const { user } = useAuthStore();
  const theme = getBankTheme(user?.banque);
  const [chartData, setChartData] = useState<Array<{ mois: string; validées: number; converties: number }>>([]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    // Générer des données mensuelles basées sur les simulations (12 derniers mois)
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const moisLabel = formatDateMonthShort(date);

      const validées = simulations.filter((s) => {
        const simDate = new Date(s.created_at);
        return simDate.getMonth() === date.getMonth() &&
          simDate.getFullYear() === date.getFullYear() &&
          s.statut === "validee";
      }).length;

      const converties = simulations.filter((s) => {
        const simDate = new Date(s.created_at);
        return simDate.getMonth() === date.getMonth() &&
          simDate.getFullYear() === date.getFullYear() &&
          s.statut === "convertie";
      }).length;

      return { mois: moisLabel, validées, converties };
    });

    setChartData(data);
  }, [simulations]);

  const primaryColor = theme.primary.includes("blue") ? "#3b82f6" :
    theme.primary.includes("green") ? "#10b981" :
      theme.primary.includes("orange") ? "#f97316" :
        theme.primary.includes("purple") ? "#8b5cf6" :
          theme.primary.includes("cyan") ? "#06b6d4" :
            theme.primary.includes("teal") ? "#14b8a6" :
              theme.primary.includes("rose") ? "#f43f5e" : "#3b82f6";

  return (
    <Card className="border-0 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Statistiques</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Évolution des simulations par mois</p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
              <span className="font-medium text-gray-700">Validées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
              <span className="font-medium text-gray-700">Converties</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="mois"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Bar
              dataKey="validées"
              fill="#10b981"
              name="Validées"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="converties"
              fill="#3b82f6"
              name="Converties"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
