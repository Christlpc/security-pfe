"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getBankTheme } from "@/lib/utils/theme";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ProductOverview } from "@/components/dashboard/ProductOverview";
import { SimulationsByProduct } from "@/components/dashboard/SimulationsByProduct";
import { ConversionChart } from "@/components/dashboard/ConversionChart";

import { ROLES } from "@/lib/utils/constants";
import { AdminStats } from "@/components/dashboard/AdminStats";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const theme = getBankTheme(user?.banque);
  const isAdmin = user?.role === ROLES.SUPER_ADMIN_NSIA || user?.role === ROLES.ADMIN_NSIA;

  if (isAdmin) {
    return (
      <div className="space-y-8 pb-8">
        <DashboardHeader theme={theme} />
        <AdminStats />
        <RecentActivity />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <DashboardHeader theme={theme} />

      <QuickStats theme={theme} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ConversionChart />
        </div>
        <div className="flex flex-col gap-8 h-full">
          <div className="flex-1 min-h-0">
            <ProductOverview theme={theme} />
          </div>
          <div className="flex-1 min-h-0">
            <SimulationsByProduct />
          </div>
        </div>
      </div>

      <RecentActivity />
    </div>
  );
}
