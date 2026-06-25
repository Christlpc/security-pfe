"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/theme";
import type { BankTheme } from "@/lib/utils/theme";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  theme: BankTheme;
}

export function DashboardHeader({ theme }: DashboardHeaderProps) {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Dashboard
              </h1>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
