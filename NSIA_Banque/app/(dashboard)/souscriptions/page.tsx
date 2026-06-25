"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SouscriptionTable } from "@/components/souscriptions/SouscriptionTable";
import { SouscriptionFilters } from "@/components/souscriptions/SouscriptionFilters";
import { SouscriptionStats } from "@/components/souscriptions/SouscriptionStats";
import type { SouscriptionFilters as SouscriptionFiltersType } from "@/lib/api/simulations";
import { FileText } from "lucide-react";

export default function SouscriptionsPage() {
  const [filters, setFilters] = useState<SouscriptionFiltersType>({ page: 1, page_size: 10 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Souscriptions</h1>
              <p className="text-gray-600 mt-2">Gérez toutes les souscriptions d'assurance</p>
            </div>
          </div>
        </div>
      </div>

      <SouscriptionStats filters={filters} />

      <SouscriptionFilters filters={filters} onFiltersChange={setFilters} />
      <SouscriptionTable filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}

