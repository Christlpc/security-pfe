"use client";

import { useState, useMemo, useEffect } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";

import { useAuthStore } from "@/lib/store/authStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { STATUT_LABELS, STATUT_COLORS, ROLES } from "@/lib/utils/constants";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type FilterFn,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUIT_LABELS, type Simulation } from "@/types";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { formatDateShort } from "@/lib/utils/date";
import { ChevronLeft, ChevronRight, Eye, MoreVertical, Trash2, FileText, Search, X, Loader2, Download, FileJson, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteSimulationDialog } from "./DeleteSimulationDialog";
import { ExportStatsDialog } from "./ExportStatsDialog";
import { SimulationViewDialog } from "./SimulationViewDialog";
import { BarChart3 } from "lucide-react";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Simulation>();

// Custom fuzzy filter for global search
const fuzzyFilter: FilterFn<Simulation> = (row, columnId, value) => {
  const searchValue = value.toLowerCase();
  const simulation = row.original;

  // Search in multiple fields
  const searchableText = [
    simulation.reference,
    simulation.nom_client,
    simulation.prenom_client,
    simulation.email_client,
    simulation.telephone_client,
    PRODUIT_LABELS[simulation.produit] || simulation.produit,
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(searchValue);
};

export function SimulationTable() {
  const router = useSafeRouter();
  const { user } = useAuthStore();
  const { simulations, fetchSimulations, isLoading, deleteSimulation, exportSimulations } = useSimulationStore();
  const { getLabel, allLabels } = useProductLabels();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState<Simulation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingSimulation, setViewingSimulation] = useState<Simulation | null>(null);

  const handleRowClick = (sim: Simulation) => {
    setViewingSimulation(sim);
    setIsViewOpen(true);
  };

  // Local filter state for instant filtering
  const [globalFilter, setGlobalFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [produitFilter, setProduitFilter] = useState<string>("all");

  // Fetch ALL data on mount with large page_size
  useEffect(() => {
    fetchSimulations({ page: 1, page_size: 500 } as any, true);
  }, [fetchSimulations]);

  // Filter data locally
  const filteredData = useMemo(() => {
    let data = [...simulations];

    // Apply statut filter
    if (statutFilter && statutFilter !== "all") {
      data = data.filter(sim => sim.statut === statutFilter);
    }

    // Apply produit filter
    if (produitFilter && produitFilter !== "all") {
      data = data.filter(sim => sim.produit === produitFilter);
    }

    return data;
  }, [simulations, statutFilter, produitFilter]);

  const activeFilters = useMemo(() => {
    return {
      statut: statutFilter !== 'all' ? statutFilter : undefined,
      produit: produitFilter !== 'all' ? produitFilter : undefined,
      search: globalFilter || undefined,
    } as any; // Cast as any because SimulationFilters expects keyof enum but strings are used here
  }, [statutFilter, produitFilter, globalFilter]);

  const handleDeleteClick = (simulation: Simulation) => {
    setSimulationToDelete(simulation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!simulationToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSimulation(simulationToDelete.id);
      setDeleteDialogOpen(false);
      setSimulationToDelete(null);
      // Toast is handled by the store
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setGlobalFilter("");
    setStatutFilter("all");
    setProduitFilter("all");
  };

  const hasActiveFilters = globalFilter || statutFilter !== "all" || produitFilter !== "all";

  const columns = useMemo(
    () => [
      columnHelper.accessor("reference", {
        header: "Référence",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-medium text-gray-900">{info.getValue()}</span>
            <span className="text-xs text-gray-500">{formatDateShort(info.row.original.created_at)}</span>
          </div>
        ),
      }),
      columnHelper.accessor(
        (row) => `${row.prenom_client || ""} ${row.nom_client || ""}`.trim() || "Client inconnu",
        {
          id: "client",
          header: "Client",
          cell: (info) => (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white">
                {info.row.original.prenom_client?.charAt(0)}{info.row.original.nom_client?.charAt(0)}
              </div>
              <span className="font-medium text-gray-700">{info.getValue()}</span>
            </div>
          ),
        }
      ),
      columnHelper.accessor("produit", {
        header: "Produit",
        cell: (info) => (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 font-normal">
            {getLabel(info.getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor("statut", {
        header: "Statut",
        cell: (info) => {
          const statut = info.getValue();
          return (
            <Badge className={`${STATUT_COLORS[statut] || "bg-gray-100 text-gray-800"} shadow-sm`}>
              {STATUT_LABELS[statut] || statut}
            </Badge>
          );
        },
      }),
    ] as ColumnDef<Simulation>[],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading && simulations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 rounded-[24px] overflow-hidden">
        {/* Filters */}
        <div className="p-6 pb-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" strokeWidth={1.5} />
              <Input
                placeholder="Rechercher une simulation..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 rounded-xl border-slate-200/80 focus:border-blue-500/50 w-full"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>

            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="rounded-xl border-slate-200/80">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={produitFilter} onValueChange={setProduitFilter}>
              <SelectTrigger className="rounded-xl border-slate-200/80">
                <SelectValue placeholder="Tous les produits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                {Object.entries(allLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl border-slate-200/80 hover:bg-slate-50 w-full">
                <X className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Réinitialiser
              </Button>
            ) : (
              <div /> // Spacer if no active filters
            )}
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="max-h-[380px] overflow-y-auto border-t border-slate-100/60 relative">
          <table className="w-full text-sm text-left table-auto">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-md">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100/60 bg-white">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-lg font-semibold text-gray-900">Aucune simulation trouvée</p>
                    <p className="text-sm">Essayez de modifier vos filtres ou créez une nouvelle simulation.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer border-b border-slate-100/50 last:border-0"
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination in Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            AFFICHAGE DE {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} À {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} SUR {table.getFilteredRowModel().rows.length} SIMULATIONS
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <span className="text-xs font-bold min-w-[3rem] text-center text-gray-700">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </Card>

      {simulationToDelete && (
        <DeleteSimulationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          simulation={simulationToDelete}
          isLoading={isDeleting}
        />
      )}

      <SimulationViewDialog
        simulation={viewingSimulation}
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) {
            setViewingSimulation(null);
          }
        }}
        onEdit={(sim) => {
          router.push(`/simulations/${sim.id}/edit`);
        }}
      />
    </>
  );
}
