"use client";

import { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROLES } from "@/lib/utils/constants";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useUserStore } from "@/lib/store/userStore";
import { BanqueCard } from "@/components/banques/BanqueCard";
import { BanqueFilters } from "@/components/banques/BanqueFilters";
import { BanqueForm } from "@/components/banques/BanqueForm";
import { Button } from "@/components/ui/button";
import { Plus, Download, BarChart3, FileText, Users, ChevronLeft, ChevronRight } from "lucide-react";
import type { Banque } from "@/types";
import toast from "react-hot-toast";

export default function BanquesPage() {
  const { banques, fetchBanques, isLoading } = useBanqueStore();
  const { simulations, fetchSimulations } = useSimulationStore();
  const { users, fetchUsers } = useUserStore();

  const [searchValue, setSearchValue] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanque, setEditingBanque] = useState<Banque | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  useEffect(() => {
    fetchBanques();
    // Charger un nombre raisonnable de simulations et utilisateurs pour les stats
    fetchSimulations({ page_size: 1000 });
    fetchUsers({ page_size: 1000 });
  }, [fetchBanques, fetchSimulations, fetchUsers]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue]);

  // Calculer les statistiques pour chaque banque
  const banquesWithStats = useMemo(() => {
    return banques.map((banque) => {
      const banqueSimulations = simulations.filter((s) => {
        const sBanqueId = typeof s.banque === 'object' ? (s.banque as any).id : s.banque;
        return String(sBanqueId) === String(banque.id);
      });

      const banqueUsers = users.filter((u) => {
        if (!u.banque) return false;
        const uBanqueId = typeof u.banque === 'object' ? u.banque.id : u.banque;
        return String(uBanqueId) === String(banque.id);
      });

      return {
        banque,
        stats: {
          totalSimulations: banqueSimulations.length,
          totalUsers: banqueUsers.length,
          evolution: 0,
        },
      };
    });
  }, [banques, simulations, users]);

  // Filtrer les banques selon la recherche
  const filteredBanques = useMemo(() => {
    if (!searchValue) return banquesWithStats;

    const search = searchValue.toLowerCase();
    return banquesWithStats.filter(({ banque }) =>
      banque.nom.toLowerCase().includes(search) ||
      banque.code.toLowerCase().includes(search)
    );
  }, [banquesWithStats, searchValue]);

  // Paginer les banques filtrées
  const paginatedBanques = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBanques.slice(start, start + pageSize);
  }, [filteredBanques, currentPage]);

  const pageCount = Math.ceil(filteredBanques.length / pageSize);

  const handleEdit = (banque: Banque) => {
    setEditingBanque(banque);
    setIsFormOpen(true);
  };

  const handleExport = () => {
    toast.success("Export en cours de développement");
  };

  return (
    <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Banques Partenaires
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Gérez les {banques.length} établissements bancaires connectés à la plateforme
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="rounded-xl border-slate-200/80 hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Exporter
            </Button>
            <Button 
              onClick={() => {
                setEditingBanque(undefined);
                setIsFormOpen(true);
              }} 
              className="rounded-xl bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white hover:opacity-90 shadow-md font-semibold px-4 py-2"
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Nouvelle Banque
            </Button>
          </div>
        </div>

        {/* Statistiques globales - Premium Cards without background icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-50 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <BarChart3 className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Banques Actives</p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{banques.filter(b => b.est_active !== false).length}</span>
              <span className="text-sm text-gray-400 mb-1">/ {banques.length}</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-50 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Simulations</p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{simulations.length}</span>
              <span className="text-sm text-green-600 mb-1 font-medium bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-50 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Utilisateurs Connectés</p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{users.length}</span>
            </div>
          </div>
        </div>

        {/* Filtres full-width */}
        <div className="mb-6 w-full">
          <BanqueFilters
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onReset={() => setSearchValue("")}
          />
        </div>

        {/* Liste des banques */}
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-[24px] border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        ) : filteredBanques.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[24px] border border-dashed border-gray-200">
            <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900">Aucune banque trouvée</p>
            <p className="text-gray-500 mt-1">Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedBanques.map(({ banque, stats }) => (
                <BanqueCard
                  key={banque.id}
                  banque={banque}
                  stats={stats}
                  onEdit={handleEdit}
                />
              ))}
            </div>

            {/* Pagination Footer */}
            {filteredBanques.length > pageSize && (
              <div className="mt-8 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 rounded-[24px] border border-gray-50 gap-4">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  AFFICHAGE DE {Math.min((currentPage - 1) * pageSize + 1, filteredBanques.length)} À{" "}
                  {Math.min(currentPage * pageSize, filteredBanques.length)} SUR {filteredBanques.length} BANQUES
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" strokeWidth={1.5} />
                    Précédent
                  </Button>
                  <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm uppercase">
                    Page {currentPage} sur {pageCount}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                    disabled={currentPage >= pageCount}
                    className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Form Dialog */}
        <BanqueForm
          banque={editingBanque}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingBanque(undefined);
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
