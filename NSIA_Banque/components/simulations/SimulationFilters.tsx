"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useSimulationStore } from "@/lib/store/simulationStore";
import { STATUT_LABELS } from "@/lib/utils/constants";
import { PRODUIT_LABELS } from "@/types";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { Search, X, Loader2 } from "lucide-react";

export function SimulationFilters() {
  const { filters, setFilters, fetchSimulations, isLoading } = useSimulationStore();
  const { getLabel } = useProductLabels();
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchValue, 300);
  const isFirstRender = useRef(true);

  // Debounced search effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Apply search filter
    const searchFilter = debouncedSearch.trim() || undefined;
    const newFilters = { ...filters, search: searchFilter, page: 1 };
    setFilters(newFilters);
    fetchSimulations(newFilters, true); // Force fetch on search
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const filterValue = value === "all" ? undefined : value;
    const newFilters = { ...filters, [key]: filterValue, page: 1 };
    setFilters(newFilters);
    fetchSimulations(newFilters, true); // Force fetch on filter change
  }, [filters, setFilters, fetchSimulations]);

  const clearFilters = useCallback(() => {
    const clearedFilters = { page: 1 };
    setSearchValue("");
    setFilters(clearedFilters);
    fetchSimulations(clearedFilters, true); // Force fetch on reset
  }, [setFilters, fetchSimulations]);

  const hasActiveFilters = filters.search || filters.statut || filters.produit;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
            )}
          </div>

          <Select
            value={filters.statut || "all"}
            onValueChange={(value) => handleFilterChange("statut", value)}
          >
            <SelectTrigger>
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

          <Select
            value={filters.produit || "all"}
            onValueChange={(value) => handleFilterChange("produit", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les produits" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les produits</SelectItem>
              {Object.entries(PRODUIT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {getLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


