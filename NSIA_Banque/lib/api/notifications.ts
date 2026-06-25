import { mockNotificationApi } from "@/lib/mock/notifications";
import type { SystemNotification, NotificationFilters, NotificationStats } from "@/types/notifications";

// API de notifications désactivée - l'endpoint n'est pas encore développé côté backend
// Utilisation uniquement des mocks pour l'instant
export const notificationApi = {
  getNotifications: async (filters?: NotificationFilters): Promise<SystemNotification[]> => {
    // Désactivé : l'API n'est pas encore disponible
    // return await apiClient.get<SystemNotification[]>(`/api/v1/notifications/?${params.toString()}`);
    return mockNotificationApi.getNotifications(filters);
  },

  getNotificationStats: async (): Promise<NotificationStats> => {
    // Désactivé : l'API n'est pas encore disponible
    // return await apiClient.get<NotificationStats>("/api/v1/notifications/stats/");
    return mockNotificationApi.getNotificationStats();
  },

  markAsRead: async (id: string): Promise<void> => {
    // Désactivé : l'API n'est pas encore disponible
    // await apiClient.patch(`/api/v1/notifications/${id}/read/`);
    return mockNotificationApi.markAsRead(id);
  },

  markAllAsRead: async (): Promise<void> => {
    // Désactivé : l'API n'est pas encore disponible
    // await apiClient.post("/api/v1/notifications/mark-all-read/");
    return mockNotificationApi.markAllAsRead();
  },

  deleteNotification: async (id: string): Promise<void> => {
    // Désactivé : l'API n'est pas encore disponible
    // await apiClient.delete(`/api/v1/notifications/${id}/`);
    return mockNotificationApi.deleteNotification(id);
  },

  deleteAllRead: async (): Promise<void> => {
    // Désactivé : l'API n'est pas encore disponible
    // await apiClient.delete("/api/v1/notifications/delete-read/");
    return mockNotificationApi.deleteAllRead();
  },

  sendNotification: async (data: Omit<SystemNotification, "id" | "created_at" | "read">): Promise<void> => {
    // Désactivé : l'API n'est pas encore disponible
    // await apiClient.post("/api/v1/notifications/", data);
    return mockNotificationApi.sendNotification(data);
  },
};




