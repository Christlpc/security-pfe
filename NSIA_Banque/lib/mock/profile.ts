import { delay } from "./data";
import { useAuthStore } from "@/lib/store/authStore";
import type { User } from "@/types";
import type {
  ProfileUpdateData,
  PasswordChangeData,
  NotificationPreferences,
  LoginHistory,
  ActiveSession,
} from "@/lib/api/profile";

export const mockProfileApi = {
  getProfile: async (): Promise<User> => {
    await delay(300);
    const { user } = useAuthStore.getState();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    return user;
  },

  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    await delay(500);
    const { user, setUser } = useAuthStore.getState();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const updatedUser: User = {
      ...user,
      nom: data.nom ?? user.nom,
      prenom: data.prenom ?? user.prenom,
      email: data.email ?? user.email,
    };

    setUser(updatedUser);
    return updatedUser;
  },

  changePassword: async (data: PasswordChangeData): Promise<void> => {
    await delay(500);
    
    if (data.new_password !== data.confirm_password) {
      throw new Error("Les mots de passe ne correspondent pas");
    }

    if (data.new_password.length < 8) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères");
    }

    // Simuler une vérification de l'ancien mot de passe
    if (data.old_password === "wrong") {
      throw new Error("L'ancien mot de passe est incorrect");
    }

    // Succès
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    await delay(300);
    
    // Récupérer depuis localStorage ou valeurs par défaut
    const stored = typeof window !== "undefined" 
      ? localStorage.getItem("notification_preferences")
      : null;
    
    if (stored) {
      return JSON.parse(stored);
    }

    return {
      email_notifications: true,
      push_notifications: true,
      simulation_updates: true,
      system_alerts: true,
    };
  },

  updateNotificationPreferences: async (data: NotificationPreferences): Promise<NotificationPreferences> => {
    await delay(300);
    
    if (typeof window !== "undefined") {
      localStorage.setItem("notification_preferences", JSON.stringify(data));
    }
    
    return data;
  },

  getLoginHistory: async (): Promise<LoginHistory[]> => {
    await delay(400);
    
    const now = new Date();
    return [
      {
        id: 1,
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        login_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        logout_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        location: "Brazzaville, Congo",
      },
      {
        id: 2,
        ip_address: "192.168.1.101",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        login_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        logout_at: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
        location: "Pointe-Noire, Congo",
      },
      {
        id: 3,
        ip_address: "192.168.1.102",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        login_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Brazzaville, Congo",
      },
    ];
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    await delay(300);
    
    const now = new Date();
    return [
      {
        id: "session-1",
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        login_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        location: "Brazzaville, Congo",
      },
      {
        id: "session-2",
        ip_address: "192.168.1.103",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        login_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        location: "Pointe-Noire, Congo",
      },
    ];
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await delay(300);
    // Simuler la révocation
  },
};

