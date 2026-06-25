"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { profileApi, type LoginHistory } from "@/lib/api/profile";
import { Clock, MapPin, Monitor, Smartphone, Tablet } from "lucide-react";
import { formatDateTime, formatDateRelative } from "@/lib/utils/date";

export function LoginHistory() {
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await profileApi.getLoginHistory();
        setHistory(data);
      } catch (error) {
        console.error("Erreur lors du chargement de l'historique", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes("iPhone") || userAgent.includes("Android")) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceName = (userAgent: string) => {
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "MacOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android";
    return "Appareil inconnu";
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
          <div className="p-3 rounded-full bg-green-50">
            <Clock className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Historique des Connexions</CardTitle>
            <CardDescription>Consultez l'historique de vos connexions récentes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun historique de connexion disponible
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                  {getDeviceIcon(entry.user_agent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{getDeviceName(entry.user_agent)}</span>
                    {entry.logout_at ? (
                      <Badge variant="outline" className="text-xs">
                        Déconnecté
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Actif
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(entry.login_at)}
                    </span>
                    {entry.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {entry.location}
                      </span>
                    )}
                    <span className="font-mono text-gray-400">{entry.ip_address}</span>
                  </div>
                  {entry.logout_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Déconnexion : {formatDateTime(entry.logout_at)} ({formatDateRelative(entry.logout_at)})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}




