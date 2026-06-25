"use client";

import { useMemo, useState, useEffect } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { souscriptionsApi, type Souscription, type SouscriptionFilters } from "@/lib/api/simulations";
import { formatDateShort } from "@/lib/utils/date";
import { ChevronLeft, ChevronRight, Eye, MoreVertical, Check, X, FileText, Calendar, User, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { ValidateSouscriptionDialog } from "./ValidateSouscriptionDialog";
import { RejectSouscriptionDialog } from "./RejectSouscriptionDialog";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Souscription>();

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  validee: "Validée",
  rejetee: "Rejetée",
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-800",
  en_cours: "bg-blue-100 text-blue-800",
  validee: "bg-green-100 text-green-800",
  rejetee: "bg-red-100 text-red-800",
};

interface SouscriptionTableProps {
  filters: SouscriptionFilters;
  onFiltersChange: (filters: SouscriptionFilters) => void;
}

export function SouscriptionTable({ filters, onFiltersChange }: SouscriptionTableProps) {
  const router = useSafeRouter();
  const [souscriptions, setSouscriptions] = useState<Souscription[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Removed local filters and search state since they are now passed as props

  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSouscription, setSelectedSouscription] = useState<Souscription | null>(null);

  const fetchSouscriptions = async (currentFilters: SouscriptionFilters) => {
    setIsLoading(true);
    try {
      const response = await souscriptionsApi.getSouscriptions(currentFilters);
      setSouscriptions(response.results);
      setTotalCount(response.count);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du chargement des souscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when filters change
  useEffect(() => {
    fetchSouscriptions(filters);
  }, [filters]);

  const handleValidate = async (id: string) => {
    try {
      await souscriptionsApi.validateSouscription(id);
      toast.success("Souscription validée avec succès");
      fetchSouscriptions(filters);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la validation");
    }
  };

  const handleReject = async (id: string, raison: string) => {
    try {
      await souscriptionsApi.rejectSouscription(id, raison);
      toast.success("Souscription rejetée");
      fetchSouscriptions(filters);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du rejet");
    }
  };

  const tableColumns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `SUB-${row.id.slice(0, 8).toUpperCase()}`,
        {
          id: "reference",
          header: "Référence",
          cell: (info) => (
            <div className="flex flex-col">
              <span className="font-mono text-sm font-medium text-blue-900">{info.getValue()}</span>
              <span className="text-xs text-gray-400">Dossier</span>
            </div>
          ),
        }
      ),
      columnHelper.accessor("nom", {
        header: "Souscripteur",
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm">
              {info.row.original.prenom?.charAt(0)}{info.getValue()?.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900">{info.row.original.prenom} {info.getValue()}</div>
              <div className="text-xs text-gray-500">{info.row.original.email}</div>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("statut", {
        header: "État du dossier",
        cell: (info) => {
          const statut = info.getValue();
          return (
            <Badge className={`${STATUT_COLORS[statut] || "bg-gray-100 text-gray-800"} px-2.5 py-0.5 shadow-sm border-0`}>
              {STATUT_LABELS[statut] || statut}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("montant_prime", {
        header: "Montant Prime",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <span className="text-gray-400 text-xs italic">Non défini</span>;
          const num = parseFloat(val);
          return <span className="font-semibold text-gray-900">{formatCurrency(num)}</span>;
        }
      }),
      columnHelper.accessor("date_effet_contrat", {
        header: "Date d'Effet",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>{formatDateShort(date)}</span>
            </div>
          ) : <span className="text-gray-400">-</span>;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const souscription = info.row.original;
          const canValidate = souscription.statut === "en_attente" || souscription.statut === "en_cours";
          const canReject = souscription.statut === "en_attente" || souscription.statut === "en_cours";

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/souscriptions/${souscription.id}`);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4 text-gray-500" />
                    Voir détails
                  </DropdownMenuItem>
                  {canValidate && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSouscription(souscription);
                        setValidateDialogOpen(true);
                      }}
                      className="text-green-600 focus:text-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Valider
                    </DropdownMenuItem>
                  )}
                  {canReject && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSouscription(souscription);
                        setRejectDialogOpen(true);
                      }}
                      className="text-red-600 focus:text-red-700"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Rejeter
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ] as ColumnDef<Souscription>[],
    [router]
  );

  const table = useReactTable({
    data: souscriptions,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / (filters.page_size || 10)),
    state: {
      pagination: {
        pageIndex: (filters.page || 1) - 1,
        pageSize: filters.page_size || 10,
      },
    },
  });

  // No table definition change needed locally, but pagination handling needs update

  const handlePageChange = (newPage: number) => {
    onFiltersChange({ ...filters, page: newPage + 1 });
  };

  if (isLoading) {
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
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Header removed as it duplicated external filters */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase tracking-wider text-xs font-semibold">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-50 p-3 rounded-full mb-3">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">Aucune souscription trouvée</p>
                      <p className="text-sm">Modifiez vos filtres ou attendez de nouvelles demandes.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => router.push(`/souscriptions/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4" onClick={(e) => {
                        if (cell.column.id === 'actions') {
                          e.stopPropagation();
                        }
                      }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-gray-500">
            {totalCount > 0 ? (
              <>
                Affichage de <span className="font-medium text-gray-900">{table.getState().pagination.pageIndex * 10 + 1}</span> à{" "}
                <span className="font-medium text-gray-900">{Math.min((table.getState().pagination.pageIndex + 1) * 10, totalCount)}</span>{" "}
                sur <span className="font-medium text-gray-900">{totalCount}</span> résultats
              </>
            ) : "0 résultat"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(table.getState().pagination.pageIndex - 1)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(table.getState().pagination.pageIndex + 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {selectedSouscription && (
        <>
          <ValidateSouscriptionDialog
            open={validateDialogOpen}
            onOpenChange={setValidateDialogOpen}
            souscription={selectedSouscription}
            onValidate={handleValidate}
          />
          <RejectSouscriptionDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            souscription={selectedSouscription}
            onReject={handleReject}
          />
        </>
      )}
    </>
  );
}
