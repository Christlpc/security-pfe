"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/theme";
import type { User, Simulation } from "@/types";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { Mail, Phone, Building2, Shield, Calendar, Edit, Power, PowerOff, FileText, CheckCircle2, Clock } from "lucide-react";
import { formatDateShort } from "@/lib/utils/date";

interface UserViewDialogProps {
  user: (User & { is_active?: boolean }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: User & { is_active?: boolean }) => void;
  onActivate: (id: string | number) => void;
  onDeactivate: (user: User & { is_active?: boolean }) => void;
}

export function UserViewDialog({
  user,
  open,
  onOpenChange,
  onEdit,
  onActivate,
  onDeactivate,
}: UserViewDialogProps) {
  const { simulations, fetchSimulations } = useSimulationStore();

  useEffect(() => {
    if (open) {
      fetchSimulations({ page_size: 1000 });
    }
  }, [open, fetchSimulations]);

  // Filter simulations done by this user
  const userSimulations = useMemo(() => {
    if (!user) return [];
    return simulations.filter(
      (sim) => String(sim.created_by) === String(user.id)
    );
  }, [simulations, user]);

  if (!user) return null;

  const isActive = user.is_active !== false;
  const fullName = `${user.prenom || ""} ${user.nom || ""}`.trim() || "Utilisateur";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[24px] border-0 shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-md">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <Avatar
              name={fullName}
              email={user.email}
              size="lg"
              showStatus
              isActive={isActive}
              className="rounded-full ring-4 ring-white shadow-md"
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-gray-900 truncate">
                {fullName}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={`border-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </Badge>
                <Badge
                  className={
                    isActive
                      ? "bg-green-50 text-green-700 border-0 shadow-sm px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      : "bg-red-50 text-red-700 border-0 shadow-sm px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  }
                >
                  {isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Adresse Email</p>
                <p className="font-medium text-gray-800 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Téléphone</p>
                <p className="font-medium text-gray-800">{user.telephone || "Non renseigné"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Building2 className="h-4 w-4 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Banque Affiliée</p>
                <p className="font-medium text-gray-800 truncate">
                  {user.banque?.nom || "Non assignée (NSIA Vie)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Date d'intégration</p>
                <p className="font-medium text-gray-800">
                  {user.date_creation ? formatDateShort(user.date_creation) : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Simulations Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-400" />
                Simulations effectuées ({userSimulations.length})
              </h4>
            </div>

            <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-2xl">
              {userSimulations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Aucune simulation enregistrée par cet utilisateur.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Référence</th>
                      <th className="px-4 py-2">Produit</th>
                      <th className="px-4 py-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userSimulations.map((sim) => (
                      <tr key={sim.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-900">{sim.reference}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">
                          {sim.produit === "emprunteur" ? "Emprunteur" : sim.produit === "confort_retraite" ? "Retraite" : sim.produit}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sim.statut === "convertie" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                          }`}>
                            {sim.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2">
          <div>
            {isActive ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onDeactivate(user);
                }}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 px-4"
              >
                <PowerOff className="mr-2 h-4 w-4" />
                Désactiver
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onActivate(user.id);
                }}
                className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 h-10 px-4"
              >
                <Power className="mr-2 h-4 w-4" />
                Activer
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-200 h-10 px-4"
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(user);
              }}
              className="rounded-xl bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white hover:opacity-90 shadow-md font-semibold h-10 px-4"
            >
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
