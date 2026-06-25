"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { LoginHistory } from "@/components/settings/LoginHistory";
import { ActiveSessions } from "@/components/settings/ActiveSessions";
import { AccountInfo } from "@/components/settings/AccountInfo";
import { ROLES } from "@/lib/utils/constants";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
              <p className="text-gray-600 mt-1">
                Gérez vos préférences, votre profil et vos sessions
              </p>
            </div>
          </div>
        </div>

        {/* Informations du compte (lecture seule) */}
        <AccountInfo />

        {/* Formulaire de profil */}
        <ProfileForm />

        {/* Changement de mot de passe */}
        <PasswordForm />

        {/* Changement de mot de passe */}
        <PasswordForm />

        {/* Sections supprimées pour le mode Live (Backend non prêt) :
            - NotificationPreferences
            - LoginHistory
            - ActiveSessions
        */}
      </div>
    </ProtectedRoute>
  );
}


