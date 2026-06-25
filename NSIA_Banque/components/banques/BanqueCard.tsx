"use client";

import { useEffect, useState } from "react";
import { banqueApi } from "@/lib/api/banques";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBankTheme } from "@/lib/utils/theme";
import { PRODUIT_LABELS } from "@/types";
import type { Banque } from "@/types";
import { Edit, Trash2, Users, FileText, ArrowRight } from "lucide-react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { formatDateMonthYear } from "@/lib/utils/date";
import { DeleteBanqueDialog } from "./DeleteBanqueDialog";

interface BanqueCardProps {
  banque: Banque;
  stats?: {
    totalSimulations: number;
    totalUsers: number;
    evolution: number;
  };
  onEdit?: (banque: Banque) => void;
}

export function BanqueCard({ banque, stats, onEdit }: BanqueCardProps) {
  const router = useSafeRouter();
  const theme = getBankTheme(banque);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [products, setProducts] = useState<string[]>(banque.produits_disponibles || []);

  useEffect(() => {
    const loadProducts = async () => {
      // Si la liste est vide, on tente de la récupérer
      if (products.length === 0) {
        try {
          const fetchedProducts = await banqueApi.getBanqueProduits(banque.id);
          if (Array.isArray(fetchedProducts) && fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          }
        } catch (error) {
          console.error("Erreur chargement produits carte:", error);
        }
      }
    };
    loadProducts();
  }, [banque.id]);

  return (
    <>
      <Card 
        onClick={() => router.push(`/banques/${banque.id}`)}
        className="border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group bg-white flex flex-col h-full cursor-pointer"
      >
        {/* Header avec gradient et Logo */}
        <div className={`relative h-24 ${theme.gradient} p-4 flex items-start justify-between`}>
          <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm mt-8 ml-2">
            {banque.logo ? (
              <img
                src={banque.logo}
                alt={banque.nom}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg ${theme.accent.replace('text-', 'bg-').replace('[', 'text-[')}`}>
                {banque.nom.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Badge className={`${banque.est_active ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"} text-white border-0 shadow-sm`}>
              {banque.est_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </div>

        <CardHeader className="pt-10 pb-2 px-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
                {banque.nom}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-mono">{banque.code}</Badge>
                {banque.date_partenariat && (
                  <span className="text-xs text-gray-400">
                    Depuis {new Date(banque.date_partenariat).getFullYear()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 flex-grow flex flex-col gap-6">
          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{stats.totalSimulations}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Simuls</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{stats.totalUsers}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Utilisateurs</p>
                </div>
              </div>
            </div>
          )}

          {/* Products Tags */}
          <div className="space-y-2 flex-grow">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produits disponibles</p>
            <div className="flex flex-wrap gap-1.5">
              {products.length > 0 ? (
                products.slice(0, 3).map((produit) => (
                  <Badge
                    key={produit}
                    variant="secondary"
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-0"
                  >
                    {PRODUIT_LABELS[produit as keyof typeof PRODUIT_LABELS] || produit}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-400 italic">Aucun produit configuré</span>
              )}
              {products.length > 3 && (
                <Badge variant="outline" className="text-gray-400 text-xs">+{products.length - 3}</Badge>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <DeleteBanqueDialog
        banque={banque}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}
