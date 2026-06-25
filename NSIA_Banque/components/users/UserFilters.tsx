"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/lib/store/userStore";
import { useAuthStore } from "@/lib/store/authStore";
import { ROLES } from "@/lib/utils/constants";
import { getRoleDisplayName } from "@/lib/utils/theme";
import { banqueApi } from "@/lib/api/banques";
import type { Banque } from "@/types";
import { Search, X } from "lucide-react";

export function UserFilters() {
  const { filters, setFilters, fetchUsers } = useUserStore();
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchValue, 500);
  const [banques, setBanques] = useState<Banque[]>([]);
  const lastAppliedSearch = useRef(filters.search || "");
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only trigger if the value actually changed from last applied
    if (debouncedSearch !== lastAppliedSearch.current) {
      lastAppliedSearch.current = debouncedSearch;
      const newFilters = { ...filters, search: debouncedSearch || undefined, page: 1 };
      setFilters(newFilters);
      // Removed redundant fetchUsers(newFilters) call for instant local filtering
    }
  }, [debouncedSearch]); // Only depend on debouncedSearch

  const { user } = useAuthStore.getState();

  useEffect(() => {
    const loadBanques = async () => {
      // Seuls les admins et super admins peuvent voir/filtrer par banque
      if (user?.role === ROLES.SUPER_ADMIN_NSIA || user?.role === ROLES.ADMIN_NSIA) {
        try {
          const response = await banqueApi.getBanques();
          setBanques(response.results);
        } catch (error) {
          console.error("Erreur lors du chargement des banques", error);
        }
      }
    };
    loadBanques();
  }, [user]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // La recherche sera déclenchée par l'effet debouncedSearch
  };

  const handleFilterChange = (key: string, value: string) => {
    const filterValue: any = value === "all" ? undefined : value;

    const newFilters = { ...filters, [key]: filterValue, page: 1 };
    setFilters(newFilters);
    // Removed redundant fetchUsers(newFilters) call for instant local filtering
  };

  const clearFilters = () => {
    const clearedFilters = { page: 1, page_size: 1000 };
    setFilters(clearedFilters);
    setSearchValue("");
    fetchUsers(clearedFilters, true); // Force fetch on reset to clear any local issues
  };

  const hasActiveFilters = filters.search || filters.role || filters.banque || filters.is_active !== undefined;

  const roleOptions = [
    { value: "all", label: "Tous les rôles" },
    { value: ROLES.SUPER_ADMIN_NSIA, label: getRoleDisplayName(ROLES.SUPER_ADMIN_NSIA) },
    { value: ROLES.ADMIN_NSIA, label: getRoleDisplayName(ROLES.ADMIN_NSIA) },
    { value: ROLES.RESPONSABLE_BANQUE, label: getRoleDisplayName(ROLES.RESPONSABLE_BANQUE) },
    { value: ROLES.GESTIONNAIRE, label: getRoleDisplayName(ROLES.GESTIONNAIRE) },
    { value: ROLES.SUPPORT, label: getRoleDisplayName(ROLES.SUPPORT) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 w-full">
      <div className="relative md:col-span-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher par nom, prénom, email..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 rounded-xl border-slate-200/80 bg-white w-full"
        />
      </div>

      <Select
        value={filters.role || "all"}
        onValueChange={(value) => handleFilterChange("role", value)}
      >
        <SelectTrigger className="rounded-xl border-slate-200/80 bg-white">
          <SelectValue placeholder="Tous les rôles" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 shadow-lg">
          {roleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.banque ? String(filters.banque) : "all"}
        onValueChange={(value) => handleFilterChange("banque", value)}
      >
        <SelectTrigger className="rounded-xl border-slate-200/80 bg-white">
          <SelectValue placeholder="Toutes les banques" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 shadow-lg">
          <SelectItem value="all">Toutes les banques</SelectItem>
          {banques
            .filter((banque) => banque.id)
            .map((banque, index) => (
              <SelectItem key={`banque-${banque.id}-${index}`} value={String(banque.id)}>
                {banque.nom || `Banque ${banque.id}`}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={
          filters.is_active === undefined
            ? "all"
            : filters.is_active
              ? "active"
              : "inactive"
        }
        onValueChange={(value) => {
          if (value === "all") {
            const newFilters = { ...filters };
            delete newFilters.is_active;
            newFilters.page = 1;
            setFilters(newFilters);
          } else {
            const activeValue = value === "active";
            const newFilters = { ...filters, is_active: activeValue, page: 1 };
            setFilters(newFilters);
          }
        }}
      >
        <SelectTrigger className="rounded-xl border-slate-200/80 bg-white">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 shadow-lg">
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="active">Actifs uniquement</SelectItem>
          <SelectItem value="inactive">Inactifs uniquement</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
          <X className="mr-2 h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}

