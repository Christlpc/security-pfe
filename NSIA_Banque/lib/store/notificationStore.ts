import { create } from "zustand";
import { notificationApi } from "@/lib/api/notifications";
import type { SystemNotification, NotificationFilters, NotificationStats } from "@/types/notifications";
import toast from "react-hot-toast";

interface NotificationStore {
  notifications: SystemNotification[];
  stats: NotificationStats | null;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;

  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  fetchStats: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  addNotification: (notification: Omit<SystemNotification, "id" | "created_at" | "read">) => void;
  refresh: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  stats: null,
  isLoading: false,
  error: null,
  unreadCount: 0,

  fetchNotifications: async (filters?: NotificationFilters) => {
    set({ isLoading: true, error: null });
    try {
      const data = await notificationApi.getNotifications(filters);
      set({ notifications: data, isLoading: false });
      
      // Mettre à jour le compteur de non lus
      const unread = data.filter((n) => !n.read).length;
      set({ unreadCount: unread });
    } catch (error: any) {
      set({
        error: error?.message || "Erreur lors du chargement des notifications",
        isLoading: false,
      });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await notificationApi.getNotificationStats();
      set({ stats, unreadCount: stats.unread });
    } catch (error: any) {
      console.error("Erreur lors du chargement des statistiques", error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      toast.error("Erreur lors du marquage de la notification");
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error: any) {
      toast.error("Erreur lors du marquage des notifications");
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      const notification = get().notifications.find((n) => n.id === id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      }));
    } catch (error: any) {
      toast.error("Erreur lors de la suppression de la notification");
    }
  },

  deleteAllRead: async () => {
    try {
      await notificationApi.deleteAllRead();
      set((state) => ({
        notifications: state.notifications.filter((n) => !n.read),
      }));
      toast.success("Toutes les notifications lues ont été supprimées");
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  },

  addNotification: (notification) => {
    const newNotification: SystemNotification = {
      ...notification,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      read: false,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  refresh: async () => {
    await Promise.all([
      get().fetchNotifications(),
      get().fetchStats(),
    ]);
  },
}));




