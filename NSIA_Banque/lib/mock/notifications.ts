import { delay } from "./data";
import type { SystemNotification, NotificationFilters, NotificationStats } from "@/types/notifications";

const STORAGE_KEY = "nsia_mock_notifications";

// Helper to get notifications from storage
const getStoredNotifications = (): SystemNotification[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

// Helper to save notifications
const saveNotifications = (notes: SystemNotification[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

// Initialize if empty
if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
  const now = new Date();
  const initialData: SystemNotification[] = [
    {
      id: "1",
      type: "simulation",
      priority: "high",
      title: "Nouvelle simulation créée",
      message: "Une nouvelle simulation a été créée pour le client Jean Dupont",
      read: false,
      created_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      action_url: "/simulations/1",
      action_label: "Voir la simulation",
      metadata: { simulation_id: "1" },
    },
    // ... other initial data if needed, kept minimal for clean slate testing
  ];
  saveNotifications(initialData);
}

export const mockNotificationApi = {
  getNotifications: async (filters?: NotificationFilters): Promise<SystemNotification[]> => {
    await delay(300);
    let filtered = getStoredNotifications();

    if (filters?.type) {
      filtered = filtered.filter((n) => n.type === filters.type);
    }
    if (filters?.read !== undefined) {
      filtered = filtered.filter((n) => n.read === filters.read);
    }
    if (filters?.priority) {
      filtered = filtered.filter((n) => n.priority === filters.priority);
    }

    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getNotificationStats: async (): Promise<NotificationStats> => {
    await delay(200);
    const notifications = getStoredNotifications();
    const unread = notifications.filter((n) => !n.read).length;

    const by_type: Record<string, number> = { simulation: 0, user: 0, banque: 0, system: 0, alert: 0 };
    const by_priority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };

    notifications.forEach((n) => {
      by_type[n.type] = (by_type[n.type] || 0) + 1;
      by_priority[n.priority] = (by_priority[n.priority] || 0) + 1;
    });

    return {
      total: notifications.length,
      unread,
      by_type: by_type as any,
      by_priority: by_priority as any,
    };
  },

  markAsRead: async (id: string): Promise<void> => {
    await delay(200);
    const notifications = getStoredNotifications();
    const index = notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      saveNotifications(notifications);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    await delay(300);
    const notifications = getStoredNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  },

  deleteNotification: async (id: string): Promise<void> => {
    await delay(200);
    const notifications = getStoredNotifications();
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  },

  deleteAllRead: async (): Promise<void> => {
    await delay(300);
    const notifications = getStoredNotifications();
    const updated = notifications.filter((n) => !n.read);
    saveNotifications(updated);
  },

  // Simulates sending a notification (backend push)
  sendNotification: async (data: Omit<SystemNotification, "id" | "created_at" | "read">): Promise<void> => {
    await delay(100);
    const notifications = getStoredNotifications();
    const newNotification: SystemNotification = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      read: false,
    };
    notifications.unshift(newNotification);
    saveNotifications(notifications);
  },

  addNotification: (notification: Omit<SystemNotification, "id" | "created_at">) => {
    // Legacy support, same as sendNotification but sync return
    const notifications = getStoredNotifications();
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      read: false // Force defaults
    };
    notifications.unshift(newNotification as SystemNotification);
    saveNotifications(notifications);
    return newNotification as SystemNotification;
  },
};




