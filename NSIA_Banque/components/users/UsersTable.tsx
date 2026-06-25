"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/lib/store/userStore";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/theme";
import type { User } from "@/types";
import { ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { DeactivateUserDialog } from "./DeactivateUserDialog";
import { UserFilters } from "./UserFilters";

const columnHelper = createColumnHelper<User & { is_active?: boolean }>();

export function UsersTable() {
  const {
    users,
    totalCount,
    filters,
    setFilters,
    fetchUsers,
    isLoading,
    deleteUser,
    activateUser,
    deactivateUser,
  } = useUserStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User & { is_active?: boolean }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.prenom} ${row.nom}`,
        {
          id: "nom_complet",
          header: "Utilisateur",
          cell: (info) => {
            const user = info.row.original;
            const fullName = `${user.prenom} ${user.nom}`;
            return (
              <div className="flex items-center gap-3">
                <Avatar
                  name={fullName}
                  email={user.email}
                  size="md"
                  showStatus
                  isActive={user.is_active !== false}
                />
                <div>
                  <div className="font-semibold text-gray-900">{fullName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            );
          },
        }
      ),
      columnHelper.accessor("role", {
        header: "Rôle",
        cell: (info) => {
          const role = info.getValue();
          return (
            <Badge className={`border-0 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(role)}`}>
              {getRoleDisplayName(role)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("banque", {
        header: "Banque",
        cell: (info) => {
          const banque = info.getValue();
          if (!banque) {
            return (
              <span className="text-gray-400 font-medium text-xs">Non assignée</span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50/85 text-blue-700 text-xs font-semibold">
              {banque.nom || "N/A"}
            </span>
          );
        },
      }),
      columnHelper.accessor("is_active", {
        header: "Statut",
        cell: (info) => {
          const isActive = info.getValue() !== false;
          return (
            <Badge
              className={
                isActive
                  ? "bg-green-50 text-green-700 border-0 shadow-sm px-2.5 py-1 rounded-full text-xs font-semibold"
                  : "bg-red-50 text-red-700 border-0 shadow-sm px-2.5 py-1 rounded-full text-xs font-semibold"
              }
            >
              {isActive ? "Actif" : "Inactif"}
            </Badge>
          );
        },
      }),
    ] as ColumnDef<User & { is_active?: boolean }>[],
    []
  );

  // Perform local filtering as a fallback/hybrid approach
  const filteredData = useMemo(() => {
    let data = [...users];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.nom.toLowerCase().includes(search) ||
          u.prenom.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (filters.role && (filters.role as string) !== "all") {
      // Special handling for legacy/variant role strings (ADMIN and ADMIN_NSIA are same)
      const roleStr = filters.role as string;
      if (roleStr === "ADMIN" || roleStr === "ADMIN_NSIA") {
        data = data.filter((u) => u.role === "ADMIN" || (u.role as string) === "ADMIN_NSIA");
      } else {
        data = data.filter((u) => u.role === filters.role);
      }
    }

    // Banque filter
    if (filters.banque && filters.banque !== "all") {
      data = data.filter((u) => String(u.banque?.id) === String(filters.banque));
    }

    // Status filter
    if (filters.is_active !== undefined) {
      data = data.filter((u) => (u.is_active !== false) === filters.is_active);
    }

    return data;
  }, [users, filters]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: false, // Switch to client-side pagination for the locally filtered data
  });

  const handleRowClick = (id: string | number) => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("viewUser", { detail: { id } }));
    }
  };

  const handleDeleteClick = (user: User & { is_active?: boolean }) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const userId = selectedUser.id; // Support string/UUID IDs
      await deleteUser(userId);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers(filters);
    } catch (error) {
      // Erreur gérée par le store
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: string | number) => {
    try {
      await activateUser(id);
      fetchUsers(filters);
    } catch (error) {
      // Erreur gérée par le store
    }
  };

  const handleDeactivateClick = (user: User & { is_active?: boolean }) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const userId = selectedUser.id;
      await deactivateUser(userId);
      setDeactivateDialogOpen(false);
      setSelectedUser(null);
      fetchUsers(filters);
    } catch (error) {
      // Erreur gérée par le store
    } finally {
      setActionLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const pageIndex = newPage - 1;
    if (pageIndex < 0 || pageIndex >= table.getPageCount()) return;
    table.setPageIndex(pageIndex);
  };

  if (isLoading && users.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-gray-500">Chargement des utilisateurs...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paginationState = table.getState().pagination;
  const currentPage = paginationState.pageIndex + 1;
  const pageCount = table.getPageCount();
  const pageSize = paginationState.pageSize;
  const displayedCount = table.getFilteredRowModel().rows.length;

  return (
    <Card className="border-0 rounded-[24px] overflow-hidden">
      <CardContent className="p-0">
        {/* Card Header with title */}
        <div className="px-6 pt-6 pb-2 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 tracking-tight uppercase">Liste des Utilisateurs</h2>
          <div className="text-xs text-slate-400 font-semibold uppercase">
            {displayedCount} utilisateur(s)
          </div>
        </div>

        {/* Filters and search integrated in a single block */}
        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/30">
          <UserFilters />
        </div>

        {/* Scrollable Table Area */}
        <div className="max-h-[380px] overflow-y-auto relative">
          <table className="w-full table-auto">
            <thead className="bg-slate-50/80 border-b border-slate-100 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-md">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left font-semibold text-gray-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <UserX className="h-10 w-10 text-gray-300" />
                      <span className="text-sm font-medium">Aucun utilisateur trouvé</span>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.original.id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-slate-100/50 last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
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
        <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 gap-4">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            AFFICHAGE DE {displayedCount > 0 ? paginationState.pageIndex * pageSize + 1 : 0} À{" "}
            {Math.min((paginationState.pageIndex + 1) * pageSize, displayedCount)} SUR {displayedCount}{" "}
            UTILISATEURS {displayedCount < users.length && `(FILTRÉS SUR ${users.length})`}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!table.getCanPreviousPage() || isLoading}
              className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
            >
              <ChevronLeft className="h-4 w-4 mr-1" strokeWidth={1.5} />
              Précédent
            </Button>
            <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm uppercase">
              Page {currentPage} sur {Math.max(1, pageCount)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!table.getCanNextPage() || isLoading}
              className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Dialogs */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        userName={selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : undefined}
        isLoading={actionLoading}
      />

      <DeactivateUserDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        onConfirm={handleDeactivateConfirm}
        userName={selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : undefined}
        isLoading={actionLoading}
      />
    </Card>
  );
}

