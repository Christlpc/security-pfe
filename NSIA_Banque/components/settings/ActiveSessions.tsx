"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profileApi, type ActiveSession } from "@/lib/api/profile";
import { Monitor, Smartphone, Tablet, MapPin, LogOut, Loader2 } from "lucide-react";
import { formatDateTime, formatDateRelative } from "@/lib/utils/date";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await profileApi.getActiveSessions();
        setSessions(data);
      } catch (error) {
        console.error("Erreur lors du chargement des sessions", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
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

  const handleRevokeClick = (session: ActiveSession) => {
    setSessionToRevoke(session);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!sessionToRevoke) return;

    setRevokingSessionId(sessionToRevoke.id);
    try {
      await profileApi.revokeSession(sessionToRevoke.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
      toast.success("Session révoquée avec succès");
      setRevokeDialogOpen(false);
      setSessionToRevoke(null);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la révocation");
    } finally {
      setRevokingSessionId(null);
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
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-50">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Sessions Actives</CardTitle>
              <CardDescription>Gérez vos sessions actives sur différents appareils</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune session active
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    {getDeviceIcon(session.user_agent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {getDeviceName(session.user_agent)}
                        </span>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Actif
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeClick(session)}
                        disabled={revokingSessionId === session.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {revokingSessionId === session.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="h-3 w-3 mr-1" />
                            Révoquer
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location || "Localisation inconnue"}
                      </span>
                      <span className="font-mono text-gray-400">{session.ip_address}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      <p>Connexion : {formatDateTime(session.login_at)}</p>
                      <p>Dernière activité : {formatDateRelative(session.last_activity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <LogOut className="h-6 w-6" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              Révoquer la session
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Êtes-vous sûr de vouloir révoquer cette session ? L'appareil sera déconnecté immédiatement.
              {sessionToRevoke && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left">
                  <p className="font-medium text-gray-900">{getDeviceName(sessionToRevoke.user_agent)}</p>
                  <p className="text-xs text-gray-500 mt-1">{sessionToRevoke.ip_address}</p>
                  {sessionToRevoke.location && (
                    <p className="text-xs text-gray-500">{sessionToRevoke.location}</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingSessionId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revokingSessionId !== null}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            >
              {revokingSessionId ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Révocation...
                </span>
              ) : (
                "Révoquer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




