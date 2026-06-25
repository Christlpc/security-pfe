"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { formatDateRelative, formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SystemNotification, NotificationType } from "@/types/notifications";
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
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "simulation":
      return "📊";
    case "user":
      return "👤";
    case "banque":
      return "🏦";
    case "system":
      return "⚙️";
    case "alert":
      return "⚠️";
    default:
      return "🔔";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const router = useSafeRouter();

  const {
    notifications,
    stats,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchStats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(filter === "all" ? undefined : { type: filter });
    fetchStats();
  }, [filter]);

  const handleNotificationClick = async (notification: SystemNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const filteredNotifications = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadNotifications = filteredNotifications.filter((n) => !n.read);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-50">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-gray-600 mt-1">
              Gérez toutes vos notifications et alertes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Non lues</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Simulations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.by_type.simulation || 0}
                  </p>
                </div>
                <span className="text-2xl">📊</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.by_priority.urgent || 0}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrer par type :</span>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Toutes
              </Button>
              <Button
                variant={filter === "simulation" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("simulation")}
              >
                Simulations
              </Button>
              <Button
                variant={filter === "user" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("user")}
              >
                Utilisateurs
              </Button>
              <Button
                variant={filter === "banque" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("banque")}
              >
                Banques
              </Button>
              <Button
                variant={filter === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("system")}
              >
                Système
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Tout marquer lu
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer lues
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "all" ? "Toutes les notifications" : `Notifications ${filter}`}
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications.length} non lues
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filteredNotifications.length} notification{filteredNotifications.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              Chargement des notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">Aucune notification</p>
              <p className="text-sm text-gray-400 mt-2">
                {filter === "all"
                  ? "Vous n'avez aucune notification pour le moment"
                  : `Aucune notification de type "${filter}"`}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                      !notification.read
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getPriorityColor(notification.priority))}
                          >
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(notification.created_at)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({formatDateRelative(notification.created_at)})
                          </span>
                          {notification.action_url && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              {notification.action_label || "Voir plus"} →
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              Supprimer les notifications lues
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Êtes-vous sûr de vouloir supprimer toutes les notifications lues ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteAllRead();
                setDeleteAllDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




