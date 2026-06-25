import { useNotificationStore } from "@/lib/store/notificationStore";
import type { NotificationType, NotificationPriority } from "@/types/notifications";

export function useNotifications() {
  const { addNotification } = useNotificationStore();

  const notify = (
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    message: string,
    options?: {
      action_url?: string;
      action_label?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    addNotification({
      type,
      priority,
      title,
      message,
      action_url: options?.action_url,
      action_label: options?.action_label,
      metadata: options?.metadata,
    });
  };

  return {
    notify,
    notifySimulation: (
      priority: NotificationPriority,
      title: string,
      message: string,
      simulationId?: number,
      actionUrl?: string
    ) => {
      notify("simulation", priority, title, message, {
        action_url: actionUrl || (simulationId ? `/simulations/${simulationId}` : undefined),
        action_label: "Voir la simulation",
        metadata: simulationId ? { simulation_id: simulationId } : undefined,
      });
    },
    notifyUser: (
      priority: NotificationPriority,
      title: string,
      message: string,
      userId?: number,
      actionUrl?: string
    ) => {
      notify("user", priority, title, message, {
        action_url: actionUrl || (userId ? `/users` : undefined),
        action_label: "Voir les utilisateurs",
        metadata: userId ? { user_id: userId } : undefined,
      });
    },
    notifyBanque: (
      priority: NotificationPriority,
      title: string,
      message: string,
      banqueId?: number,
      actionUrl?: string
    ) => {
      notify("banque", priority, title, message, {
        action_url: actionUrl || (banqueId ? `/banques/${banqueId}` : undefined),
        action_label: "Voir la banque",
        metadata: banqueId ? { banque_id: banqueId } : undefined,
      });
    },
    notifySystem: (
      priority: NotificationPriority,
      title: string,
      message: string
    ) => {
      notify("system", priority, title, message);
    },
  };
}




