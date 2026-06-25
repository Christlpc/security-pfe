"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { getBankTheme, getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/theme";
import { ROLES } from "@/lib/utils/constants";
import { LogOut, User, Settings, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useSafeRouter();
  const theme = getBankTheme(user?.banque);
  const currentDate = format(new Date(), "d MMMM yyyy", { locale: fr });
  const isAdmin = user?.role === ROLES.SUPER_ADMIN_NSIA || user?.role === ROLES.ADMIN_NSIA;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className={`bg-white border-b-2 ${theme.accent.replace("text", "border")} sticky top-0 z-30 shadow-sm`}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className={`w-1 h-8 rounded-full ${theme.gradient}`} />
          <div>
            <h1 className={`text-2xl font-bold ${theme.accent}`}>
              {user?.banque?.nom || "NSIA Vie Assurances"}
            </h1>
            {user && (
              <Badge className={`${getRoleBadgeColor(user.role)} text-xs mt-1`}>
                {getRoleDisplayName(user.role)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Date */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-700 shadow-sm text-sm font-medium mr-2">
            <Calendar className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
            <span>{currentDate}</span>
          </div>

          {/* Notifications */}
          {isAdmin && <NotificationCenter />}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                {user && (
                  <Avatar
                    name={`${user.prenom} ${user.nom}`}
                    email={user.email}
                    size="sm"
                    showStatus
                    isActive={true}
                  />
                )}
                <span className="hidden md:inline">
                  {user?.prenom} {user?.nom}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  {user && (
                    <Avatar
                      name={`${user.prenom} ${user.nom}`}
                      email={user.email}
                      size="md"
                      showStatus
                      isActive={true}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user?.prenom} {user?.nom}
                    </span>
                    <span className="text-xs text-gray-500">{user?.email}</span>
                    <Badge className={`${getRoleBadgeColor(user?.role || "")} text-xs mt-1`}>
                      {getRoleDisplayName(user?.role || "")}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

