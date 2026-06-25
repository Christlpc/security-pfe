// Types pour le système de notifications

export type NotificationType = "simulation" | "user" | "banque" | "system" | "alert";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
  metadata?: {
    simulation_id?: string;
    user_id?: number;
    banque_id?: number | string; // UUID ou number
    [key: string]: any;
  };
}

export interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  priority?: NotificationPriority;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}




