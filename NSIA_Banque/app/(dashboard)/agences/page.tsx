"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, Search, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AgencesTable } from "@/components/agences/AgencesTable";
import { AgenceDialog } from "@/components/agences/AgenceDialog";
import { DeleteAgenceDialog } from "@/components/agences/DeleteAgenceDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAgenceStore } from "@/lib/store/agenceStore";
import { useAuthStore } from "@/lib/store/authStore";
import { canManageAgences } from "@/lib/utils/permissions";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useBanques } from "@/lib/providers/ResourceProvider";
import type { Agence } from "@/types";

import { AgenceViewDialog } from "@/components/agences/AgenceViewDialog";
import toast from "react-hot-toast";

export default function AgencesPage() {
    const router = useSafeRouter();
    const { user } = useAuthStore();
    const { agences, isLoading, fetchAgences, updateAgence } = useAgenceStore();
    const { banques } = useBanques();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBanque, setSelectedBanque] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const lastAppliedSearch = useRef("");
    const isInitialMount = useRef(true);
    const [selectedAgence, setSelectedAgence] = useState<Agence | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingAgence, setViewingAgence] = useState<Agence | null>(null);

    // Rediriger uniquement si non connecté
    useEffect(() => {
        if (!user && !isLoading) {
            router.replace("/login");
        }
    }, [user, router, isLoading]);

    // Unified fetch function to ensure all filters are always included
    const applyFilters = useCallback(() => {
        fetchAgences({
            search: searchTerm,
            banque: selectedBanque === "all" ? undefined : selectedBanque,
            active: statusFilter === "all" ? undefined : statusFilter === "active",
            page_size: 1000 // Ensure we get all agences for client-side filtering
        });
    }, [searchTerm, selectedBanque, statusFilter, fetchAgences]);

    // Initial fetch only - subsequent filtering is local via useMemo
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    useEffect(() => {
        isInitialMount.current = false;
    }, []);

    const handleCreate = () => {
        setSelectedAgence(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (agence: Agence) => {
        setSelectedAgence(agence);
        setIsDialogOpen(true);
    };

    const handleDelete = (agence: Agence) => {
        setSelectedAgence(agence);
        setIsDeleteOpen(true);
    };

    const handleView = (agence: Agence) => {
        setViewingAgence(agence);
        setIsViewOpen(true);
    };

    // Local data filtering for immediate feedback and backend fallback
    const filteredAgences = useMemo(() => {
        let data = [...agences];

        if (debouncedSearch) {
            const search = debouncedSearch.toLowerCase();
            data = data.filter(a =>
                a.nom.toLowerCase().includes(search) ||
                a.code.toLowerCase().includes(search) ||
                a.ville.toLowerCase().includes(search)
            );
        }

        if (selectedBanque !== "all") {
            data = data.filter(a => String(a.banque) === String(selectedBanque));
        }

        if (statusFilter !== "all") {
            const isActive = statusFilter === "active";
            data = data.filter(a => (a.active !== false) === isActive);
        }

        return data;
    }, [agences, debouncedSearch, selectedBanque, statusFilter]);

    const canManage = canManageAgences(user?.role);

    // Compute stats
    const total = agences.length;
    const actives = agences.filter(a => a.active !== false).length;
    const inactives = agences.filter(a => a.active === false).length;

    return (
        <div className="space-y-8 pb-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
                        Gestion des Agences
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gérez le réseau d'agences bancaires partenaires
                    </p>
                </div>
                {canManage && (
                    <Button 
                        onClick={handleCreate} 
                        className="rounded-xl bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white hover:opacity-90 shadow-md font-semibold px-4 py-2"
                    >
                        <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} /> Nouvelle Agence
                    </Button>
                )}
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Agences</span>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-gray-900">{total}</p>
                            <p className="text-xs text-slate-500 mt-1">Agences enregistrées</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Actives */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Agences Actives</span>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-gray-900">{actives}</p>
                            <p className="text-xs text-slate-500 mt-1">Opérationnelles</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Inactives */}
                <Card className="border-0 rounded-[24px] overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Agences Inactives</span>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-gray-900">{inactives}</p>
                            <p className="text-xs text-slate-500 mt-1">Désactivées</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AgencesTable
                agences={filteredAgences}
                isLoading={isLoading}
                onView={handleView}
                filtersNode={
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                        <div className="relative col-span-1 md:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher par nom, code ou ville..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-white border-slate-200/80 focus:bg-white transition-colors rounded-xl w-full"
                            />
                        </div>

                        <div className="w-full">
                            <Select
                                value={selectedBanque}
                                onValueChange={setSelectedBanque}
                            >
                                <SelectTrigger className="h-10 bg-white border-slate-200/80 focus:bg-white transition-colors rounded-xl">
                                    <SelectValue placeholder="Toutes les banques" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                                    <SelectItem value="all">Toutes les banques</SelectItem>
                                    {banques.map((banque) => (
                                        <SelectItem key={String(banque.id)} value={String(banque.id)}>
                                            {banque.nom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="h-10 bg-white border-slate-200/80 focus:bg-white transition-colors rounded-xl">
                                    <SelectValue placeholder="Tous les statuts" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="active">Actives uniquement</SelectItem>
                                    <SelectItem value="inactive">Inactives uniquement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
            />

            <AgenceDialog
                agence={selectedAgence}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />

            <DeleteAgenceDialog
                agence={selectedAgence}
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
            />

            <AgenceViewDialog
                agence={viewingAgence}
                open={isViewOpen}
                onOpenChange={(open) => {
                    setIsViewOpen(open);
                    if (!open) {
                        setViewingAgence(null);
                    }
                }}
                onEdit={(a) => {
                    setSelectedAgence(a);
                    setIsDialogOpen(true);
                }}
                onToggleStatus={async (a) => {
                    try {
                        await updateAgence(a.id, { active: !a.active });
                        fetchAgences();
                        toast.success(`Agence ${!a.active ? "activée" : "désactivée"} avec succès`);
                    } catch (error) {
                        toast.error("Erreur lors de la modification du statut");
                    }
                }}
            />
        </div>
    );
}
