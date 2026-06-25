"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { useAuthStore } from "@/lib/store/authStore";
import { canManageAgences } from "@/lib/utils/permissions";
import type { Agence } from "@/types";
import { useEffect } from "react";

interface AgencesTableProps {
    agences: Agence[];
    isLoading: boolean;
    onView: (agence: Agence) => void;
    filtersNode?: React.ReactNode;
}

export function AgencesTable({ agences, isLoading, onView, filtersNode }: AgencesTableProps) {
    const { banques, fetchBanques } = useBanqueStore();
    const { user: currentUser } = useAuthStore();

    useEffect(() => {
        if (banques.length === 0) fetchBanques();
    }, [fetchBanques, banques.length]);

    const canManage = canManageAgences(currentUser?.role);

    const getBanqueName = (id: string, nameFromApi?: string) => {
        if (nameFromApi) return nameFromApi;
        const bank = banques.find(b => String(b.id) === String(id));
        if (bank) return bank.nom;

        // Fallback: Check if it matches current user's bank
        if (currentUser?.banque && String(currentUser.banque.id) === String(id)) {
            return currentUser.banque.nom;
        }

        return "Banque inconnue";
    }

    if (isLoading) {
        return (
            <div className="w-full h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (agences.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
                <p className="text-gray-500">Aucune agence trouvée</p>
            </div>
        );
    }

    return (
        <Card className="border-0 rounded-[24px] overflow-hidden">
            {/* Card Header with title */}
            <div className="px-6 pt-6 pb-2 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 tracking-tight uppercase">Liste des Agences Partenaires</h2>
                <div className="text-xs text-slate-400 font-semibold uppercase">
                    {agences.length} agence(s)
                </div>
            </div>

            {filtersNode && (
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/30">
                    {filtersNode}
                </div>
            )}

            {/* Scrollable Table Area */}
            <div className="max-h-[380px] overflow-y-auto relative">
                <Table className="table-auto">
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-md">
                        <TableRow>
                            <TableHead className="font-semibold text-gray-700 px-6 py-4">Code</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Nom</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Banque</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Ville</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold text-gray-700 py-4">Contact</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-4">Statut</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 bg-white">
                        {agences.map((agence) => (
                            <TableRow 
                                key={agence.id} 
                                onClick={() => onView(agence)}
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-slate-100/50 last:border-0"
                            >
                                <TableCell className="font-semibold text-gray-900 px-6 py-4">{agence.code}</TableCell>
                                <TableCell className="font-medium py-4">{agence.nom}</TableCell>
                                <TableCell className="py-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50/85 text-blue-700 text-xs font-semibold">
                                        {getBanqueName(agence.banque, agence.banque_nom)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-4 text-gray-600">{agence.ville}</TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-gray-500 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-700">{agence.email}</span>
                                        <span className="text-xs text-gray-400 mt-0.5">{agence.telephone}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge
                                        className={
                                            agence.active
                                                ? "bg-green-50 text-green-700 border-0 shadow-sm px-2.5 py-1 rounded-full text-xs font-semibold"
                                                : "bg-red-50 text-red-700 border-0 shadow-sm px-2.5 py-1 rounded-full text-xs font-semibold"
                                        }
                                    >
                                        {agence.active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            {/* Sunga+ footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    AFFICHAGE DE {agences.length} SUR {agences.length} AGENCES
                </div>
            </div>
        </Card>
    );
}
