"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROLES } from "@/lib/utils/constants";
import { useUserStore } from "@/lib/store/userStore";
import { UserFilters } from "@/components/users/UserFilters";
import { UsersTable } from "@/components/users/UsersTable";
import { UserForm } from "@/components/users/UserForm";
import { Button } from "@/components/ui/button";
import { Plus, Download, Users, Shield, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { User } from "@/types";
import toast from "react-hot-toast";

import { UserViewDialog } from "@/components/users/UserViewDialog";

export default function UsersPage() {
  const { users, fetchUsers, activateUser, deactivateUser } = useUserStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(User & { is_active?: boolean }) | undefined>(
    undefined
  );
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<(User & { is_active?: boolean }) | undefined>(
    undefined
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleViewUser = (event: CustomEvent) => {
      const userId = event.detail.id;
      const { users } = useUserStore.getState();
      const user = users.find((u) => u.id === userId);
      if (user) {
        setViewingUser(user as User & { is_active?: boolean });
        setIsViewOpen(true);
      }
    };

    window.addEventListener("viewUser" as any, handleViewUser as EventListener);
    return () => {
      window.removeEventListener("viewUser" as any, handleViewUser as EventListener);
    };
  }, []);

  const handleCreate = () => {
    setEditingUser(undefined);
    setIsFormOpen(true);
  };

  const handleExport = () => {
    toast.success("Export en cours de développement");
    // TODO: Implémenter l'export CSV/Excel
  };

  // Compute stats
  const total = users.length;
  const actives = users.filter(u => u.is_active !== false && u.est_actif !== false).length;
  const admins = users.filter(u => String(u.role).includes("ADMIN")).length;

  return (
    <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Gérez les utilisateurs, leurs rôles et leurs permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="rounded-xl border-slate-200/80 hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Exporter
            </Button>
            <Button 
              onClick={handleCreate} 
              className="rounded-xl bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white hover:opacity-90 shadow-md font-semibold px-4 py-2"
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Nouvel Utilisateur
            </Button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total */}
          <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Utilisateurs</span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{total}</p>
                <p className="text-xs text-slate-500 mt-1">Utilisateurs enregistrés</p>
              </div>
            </CardContent>
          </Card>

          {/* Actifs */}
          <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Membres Actifs</span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{actives}</p>
                <p className="text-xs text-slate-500 mt-1">Actifs sur la plateforme</p>
              </div>
            </CardContent>
          </Card>

          {/* Admins */}
          <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Administrateurs</span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{admins}</p>
                <p className="text-xs text-slate-500 mt-1">Rôles de gestion d'équipe</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table with integrated filters */}
        <UsersTable />

        {/* Form Dialog */}
        <UserForm
          user={editingUser}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingUser(undefined);
            }
          }}
        />

        {/* View Dialog */}
        <UserViewDialog
          user={viewingUser || null}
          open={isViewOpen}
          onOpenChange={(open) => {
            setIsViewOpen(open);
            if (!open) {
              setViewingUser(undefined);
            }
          }}
          onEdit={(u) => {
            setEditingUser(u);
            setIsFormOpen(true);
          }}
          onActivate={async (id) => {
            try {
              await activateUser(id);
              fetchUsers();
              toast.success("Utilisateur activé avec succès");
            } catch (error) {
              toast.error("Erreur lors de l'activation");
            }
          }}
          onDeactivate={async (u) => {
            try {
              await deactivateUser(u.id);
              fetchUsers();
              toast.success("Utilisateur désactivé avec succès");
            } catch (error) {
              toast.error("Erreur lors de la désactivation");
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

