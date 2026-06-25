"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store/authStore";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/theme";
import { Building2, Mail, User as UserIcon, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function AccountInfo() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-600" />
          Informations du Compte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b">
            <Avatar
              name={`${user.prenom} ${user.nom}`}
              email={user.email}
              size="lg"
              showStatus
              isActive={true}
            />
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {user.prenom} {user.nom}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Rôle</p>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            </div>

            {user.banque && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Banque</p>
                  <p className="font-medium text-gray-900">{user.banque.nom}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Code: {user.banque.code}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">ID Utilisateur</p>
                <p className="font-medium text-gray-900 font-mono text-sm">#{user.id}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




