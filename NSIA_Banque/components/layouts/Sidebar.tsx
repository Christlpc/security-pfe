"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { getBankTheme } from "@/lib/utils/theme";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  ChevronLeft,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROLES } from "@/lib/utils/constants";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    roles: ["all"],
  },
  {
    title: "Simulations",
    icon: FileText,
    href: "/simulations",
    roles: ["all"],
  },
  {
    title: "Souscriptions",
    icon: FileCheck,
    href: "/souscriptions",
    roles: ["all"],
  },
  {
    title: "Clients",
    icon: Users,
    href: "/clients",
    roles: ["all"],
  },

  {
    title: "Agences",
    icon: Building2,
    href: "/agences",
    roles: [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA],
  },
  {
    title: "Banques",
    icon: Building2,
    href: "/banques",
    roles: [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA],
  },
  {
    title: "Utilisateurs",
    icon: Users,
    href: "/users",
    roles: [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA],
  },
  {
    title: "Paramètres",
    icon: Settings,
    href: "/settings",
    roles: [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useSafeRouter();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const theme = getBankTheme(user?.banque);

  // Debug: afficher le rôle de l'utilisateur dans la console en développement
  if (process.env.NODE_ENV === "development" && user) {
    console.log("[Sidebar] User role:", user.role, "| Allowed admin roles:", [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]);
  }

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.roles.includes("all")) return true;
    if (!user || !user.role) return false;

    // Normaliser le rôle pour la comparaison (en majuscules)
    const userRole = user.role.toUpperCase();
    const allowedRoles = item.roles.map((r: string) => r.toUpperCase());

    return allowedRoles.includes(userRole);
  });

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-[#0B192C] border-r border-[#1E3E62]/30 shadow-xl transition-all duration-300",
          sidebarOpen ? "w-72" : "w-20"
        )}
      >
        <div className="flex flex-col h-full bg-[#0B192C]">
          {/* Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-[#1E3E62]/30 bg-[#0B192C]">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                {/* Bank Logo or Fallback Icon */}
                <div className="w-10 h-10 bg-[#1E3E62]/50 rounded-lg flex items-center justify-center shadow-md flex-shrink-0 border border-[#1E3E62]/30">
                  <img
                    src="/logoNsiavie.png"
                    alt="NSIA Vie Assurances"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="font-bold text-lg text-white tracking-tight">NSIA Vie</span>
              </div>
            ) : (
              <div className="w-10 h-10 mx-auto bg-[#1E3E62]/50 rounded-lg flex items-center justify-center shadow-md border border-[#1E3E62]/30">
                <img
                  src="/logoNsiavie.png"
                  alt="NSIA Vie Assurances"
                  className="w-6 h-6 object-contain"
                />
              </div>
            )}

            {sidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-full hover:bg-[#1E3E62]/30 text-slate-400 hover:text-white transition-all ml-auto"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {!sidebarOpen && (
            <div className="flex justify-center py-4 border-b border-[#1E3E62]/30 bg-[#0B192C]">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-[#1E3E62]/30 text-slate-300 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (typeof window !== "undefined" && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-[#1E3E62] text-white shadow-md border border-[#1E3E62]"
                      : "text-slate-300 hover:bg-[#1E3E62]/20 hover:text-white"
                  )}
                  title={!sidebarOpen ? item.title : undefined}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-amber-500 rounded-r-full"
                    />
                  )}

                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                    isActive ? "bg-amber-500/10 text-amber-500" : "bg-transparent group-hover:bg-[#1E3E62]/30"
                  )}>
                    <Icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "text-slate-400 group-hover:text-white")} strokeWidth={1.5} />
                  </div>

                  {sidebarOpen && (
                    <span className={cn("font-medium text-sm", isActive ? "text-white" : "text-slate-300 group-hover:text-white")}>
                      {item.title}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer avec info banque */}
          {sidebarOpen && user?.banque && (
            <div className="p-4 mx-4 mb-6 rounded-2xl bg-[#1E3E62]/20 border border-[#1E3E62]/30 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3E62] flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Connecté à</p>
                  <p className="text-sm font-bold text-white truncate">{user.banque.nom}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

