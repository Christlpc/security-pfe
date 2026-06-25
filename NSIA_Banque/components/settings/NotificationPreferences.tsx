"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { profileApi, type NotificationPreferences } from "@/lib/api/profile";
import { Bell, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    simulation_updates: true,
    system_alerts: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const data = await profileApi.getNotificationPreferences();
        setPreferences(data);
      } catch (error) {
        console.error("Erreur lors du chargement des préférences", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await profileApi.updateNotificationPreferences(preferences);
      toast.success("Préférences enregistrées avec succès");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="text-center text-gray-500">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-purple-50">
            <Bell className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Notifications</CardTitle>
            <CardDescription>Gérez vos préférences de notification</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <Label htmlFor="email_notifications" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Notifications par email
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Recevez des notifications importantes par email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="email_notifications"
                checked={preferences.email_notifications}
                onChange={() => handleToggle("email_notifications")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <Label htmlFor="push_notifications" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Notifications push
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Recevez des notifications en temps réel dans votre navigateur
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="push_notifications"
                checked={preferences.push_notifications}
                onChange={() => handleToggle("push_notifications")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <Label htmlFor="simulation_updates" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Mises à jour de simulations
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Être notifié des changements de statut de vos simulations
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="simulation_updates"
                checked={preferences.simulation_updates}
                onChange={() => handleToggle("simulation_updates")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <Label htmlFor="system_alerts" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Alertes système
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Recevez des alertes importantes du système
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="system_alerts"
                checked={preferences.system_alerts}
                onChange={() => handleToggle("system_alerts")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Enregistrer
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}




