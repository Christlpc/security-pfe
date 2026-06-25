"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useUserStore } from "@/lib/store/userStore";
import type { Banque } from "@/types";
import { getBankTheme } from "@/lib/utils/theme";
import { formatDateMonthShort } from "@/lib/utils/date";

interface BanqueStatsProps {
  banque: Banque;
}

export function BanqueStats({ banque }: BanqueStatsProps) {
  const { simulations } = useSimulationStore();
  const { users } = useUserStore();
  const theme = getBankTheme(banque);

  // Filtrer les données pour cette banque
  // Le champ banque dans simulation peut être un ID direct ou un objet
  const banqueSimulations = useMemo(() => {
    // Debug détaillé
    console.log("[BanqueStats] TARGET banque.id:", banque.id, "code:", banque.code);
    console.log("[BanqueStats] Total simulations in store:", simulations.length);

    if (simulations.length > 0) {
      // Afficher les valeurs de banque de toutes les simulations
      const uniqueBanques = [...new Set(simulations.map(s => {
        const id = typeof s.banque === 'object' && s.banque !== null
          ? (s.banque as any).id
          : s.banque;
        return String(id);
      }))];
      console.log("[BanqueStats] Unique banque IDs in simulations:", uniqueBanques);
    }

    const filtered = simulations.filter((s) => {
      // s.banque peut être un ID (string/number) ou un objet {id: ...}
      const simBanqueId = typeof s.banque === 'object' && s.banque !== null
        ? (s.banque as any).id
        : s.banque;
      const matches = String(simBanqueId) === String(banque.id);
      return matches;
    });

    console.log("[BanqueStats] Filtered simulations for this banque:", filtered.length);

    return filtered;
  }, [simulations, banque.id, banque.code]);

  const banqueUsers = useMemo(
    () => users.filter((u) => u.banque && String(u.banque.id) === String(banque.id)),
    [users, banque.id]
  );

  // Statistiques par statut
  const statutData = useMemo(() => {
    const statuts = ["brouillon", "calculee", "validee", "convertie"] as const;
    return statuts.map((statut) => ({
      name: statut.charAt(0).toUpperCase() + statut.slice(1),
      value: banqueSimulations.filter((s) => s.statut === statut).length,
    }));
  }, [banqueSimulations]);

  // Statistiques par produit
  const produitData = useMemo(() => {
    const produits = banque.produits_disponibles || [];
    const produitCounts = produits.map((produit) => ({
      name: produit,
      value: banqueSimulations.filter((s) => s.produit === produit).length,
    }));
    return produitCounts;
  }, [banqueSimulations, banque.produits_disponibles]);

  // Données mensuelles
  const monthlyData = useMemo(() => {
    // Debug: afficher les dates des simulations (avec protection contre les dates invalides)
    if (banqueSimulations.length > 0) {
      console.log("[BanqueStats] Simulation dates:", banqueSimulations.map(s => {
        try {
          return {
            id: s.id,
            created_at: s.created_at,
            parsed: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'
          };
        } catch {
          return { id: s.id, created_at: s.created_at, parsed: 'Invalid' };
        }
      }));
    }

    // Générer les 12 derniers mois pour couvrir une période plus large
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        date,
        label: formatDateMonthShort(date),
      };
    });

    const result = months.map(({ date, label }) => {
      const monthSimulations = banqueSimulations.filter((s) => {
        if (!s.created_at) return false;
        try {
          const simDate = new Date(s.created_at);
          if (isNaN(simDate.getTime())) return false;
          return simDate.getMonth() === date.getMonth() && simDate.getFullYear() === date.getFullYear();
        } catch {
          return false;
        }
      });
      return {
        mois: label,
        simulations: monthSimulations.length,
        converties: monthSimulations.filter((s) => s.statut === "convertie").length,
      };
    });

    // Filtrer pour ne garder que les 6 derniers mois avec au moins une donnée, sinon tous les 6 derniers
    const hasAnyData = result.some(m => m.simulations > 0);
    if (hasAnyData) {
      // Garder les mois avec des données et les 2 suivants pour contexte
      const lastWithData = result.findLastIndex(m => m.simulations > 0);
      const firstWithData = result.findIndex(m => m.simulations > 0);
      const startIdx = Math.max(0, firstWithData);
      const endIdx = Math.min(result.length, lastWithData + 2);
      return result.slice(startIdx, endIdx).slice(-6); // Max 6 mois
    }

    // Par défaut les 6 derniers mois
    return result.slice(-6);
  }, [banqueSimulations]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const primaryColor = theme.primary.includes("blue")
    ? "#3b82f6"
    : theme.primary.includes("green")
      ? "#10b981"
      : theme.primary.includes("purple")
        ? "#8b5cf6"
        : theme.primary.includes("orange")
          ? "#f59e0b"
          : "#3b82f6";

  // Filtrer les statuts avec au moins une valeur > 0
  const filteredStatutData = statutData.filter(d => d.value > 0);
  const hasStatutData = filteredStatutData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Graphique par statut */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Répartition par Statut</CardTitle>
        </CardHeader>
        <CardContent>
          {hasStatutData ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredStatutData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredStatutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Aucune simulation</p>
                <p className="text-sm">Il n'y a pas encore de données pour cette banque</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphique mensuel */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Évolution Mensuelle</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toujours afficher le graphique, les barres seront juste à 0 s'il n'y a pas de données */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip formatter={(value) => `${value} simulation(s)`} />
              <Legend />
              <Bar dataKey="simulations" fill={primaryColor} name="Simulations" radius={[8, 8, 0, 0]} />
              <Bar dataKey="converties" fill="#10b981" name="Converties" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {banqueSimulations.length === 0 && (
            <p className="text-sm text-center text-gray-500 mt-2">
              Aucune simulation pour cette banque sur les 6 derniers mois
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

