"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { formatDateRelative, formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { SystemNotification, NotificationType } from "@/types/notifications";

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

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh,
  } = useNotificationStore();
  
  const router = useSafeRouter();

  useEffect(() => {
    if (open) {
      fetchNotifications(filter === "all" ? undefined : { type: filter });
    }
  }, [open, filter]);

  useEffect(() => {
    // Rafraîchir les notifications toutes les 30 secondes
    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notification: SystemNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      router.push(notification.action_url);
      setOpen(false);
    }
  };

  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter((n) => n.type === filter);

  const unreadNotifications = filteredNotifications.filter((n) => !n.read);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 p-0 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] mt-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} non lues
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Tout marquer lu
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50/50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Supprimer lues
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-2 border-b border-slate-100 flex gap-1 overflow-x-auto bg-slate-50/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("all")}
              className={cn("text-xs h-7 rounded-lg px-2.5 font-semibold transition-all", filter === "all" ? "bg-[#0B192C] text-white hover:bg-[#1E3E62] hover:text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              Toutes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("simulation")}
              className={cn("text-xs h-7 rounded-lg px-2.5 font-semibold transition-all", filter === "simulation" ? "bg-[#0B192C] text-white hover:bg-[#1E3E62] hover:text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              Simulations
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("user")}
              className={cn("text-xs h-7 rounded-lg px-2.5 font-semibold transition-all", filter === "user" ? "bg-[#0B192C] text-white hover:bg-[#1E3E62] hover:text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              Utilisateurs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("banque")}
              className={cn("text-xs h-7 rounded-lg px-2.5 font-semibold transition-all", filter === "banque" ? "bg-[#0B192C] text-white hover:bg-[#1E3E62] hover:text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              Banques
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("system")}
              className={cn("text-xs h-7 rounded-lg px-2.5 font-semibold transition-all", filter === "system" ? "bg-[#0B192C] text-white hover:bg-[#1E3E62] hover:text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              Système
            </Button>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Chargement...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group",
                      !notification.read && "bg-blue-50/50"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getPriorityColor(notification.priority))}
                          >
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDateRelative(notification.created_at)}
                          </span>
                        </div>
                        {notification.action_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                          >
                            {notification.action_label || "Voir plus"} →
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}




