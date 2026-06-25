import type { User, UserRole, PaginatedResponse } from "@/types";
import type { UserCreateData, UserUpdateData, UserFilters } from "@/lib/api/users";
import { mockUsers, mockBanques } from "./data";

// Ajouter un champ is_active aux utilisateurs mock
interface ExtendedUser extends User {
  is_active?: boolean;
}

const users: ExtendedUser[] = mockUsers.map((user, index) => ({
  ...user,
  is_active: index !== 5, // Le 6ème utilisateur (support@ecobank) est inactif pour la démo
}));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockUserApi = {
  getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<User>> => {
    await delay(500);

    let filteredUsers = [...users];

    // Filtre par recherche
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(search) ||
          user.nom.toLowerCase().includes(search) ||
          user.prenom.toLowerCase().includes(search)
      );
    }

    // Filtre par rôle
    if (filters?.role) {
      filteredUsers = filteredUsers.filter((user) => user.role === filters.role);
    }

    // Filtre par banque
    if (filters?.banque) {
      filteredUsers = filteredUsers.filter((user) => user.banque?.id === filters.banque);
    }

    // Filtre par statut actif
    if (filters?.is_active !== undefined) {
      filteredUsers = filteredUsers.filter((user) => {
        const isActive = user.is_active !== false; // Par défaut actif si non défini
        return isActive === filters.is_active;
      });
    }

    // Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return {
      count: filteredUsers.length,
      next: endIndex < filteredUsers.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: paginatedUsers,
    };
  },

  getUser: async (id: number): Promise<User> => {
    await delay(300);
    const user = users.find((u) => u.id === id);
    if (!user) {
      throw new Error("Utilisateur introuvable");
    }
    return user;
  },

  createUser: async (data: UserCreateData): Promise<User> => {
    await delay(600);
    const banque = mockBanques.find((b) => b.id === data.banque);
    if (!banque) {
      throw new Error("Banque introuvable");
    }

    const newUser: ExtendedUser = {
      id: Math.max(...users.map((u) => typeof u.id === 'string' ? parseInt(u.id) : u.id)) + 1,
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      role: data.role,
      banque: banque,
      is_active: data.is_active !== false,
    };

    users.push(newUser);
    return newUser;
  },

  updateUser: async (id: number, data: UserUpdateData): Promise<User> => {
    await delay(500);
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error("Utilisateur introuvable");
    }

    const user = users[userIndex];
    let banque = user.banque;

    if (data.banque) {
      const foundBanque = mockBanques.find((b) => b.id === data.banque);
      if (foundBanque) {
        banque = foundBanque;
      }
    }

    const updatedUser: ExtendedUser = {
      ...user,
      email: data.email ?? user.email,
      nom: data.nom ?? user.nom,
      prenom: data.prenom ?? user.prenom,
      role: data.role ?? user.role,
      banque: banque,
      is_active: data.is_active !== undefined ? data.is_active : user.is_active,
    };

    users[userIndex] = updatedUser;
    return updatedUser;
  },

  deleteUser: async (id: number): Promise<void> => {
    await delay(400);
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error("Utilisateur introuvable");
    }
    users.splice(userIndex, 1);
  },

  activateUser: async (id: number): Promise<User> => {
    await delay(300);
    const user = users.find((u) => u.id === id);
    if (!user) {
      throw new Error("Utilisateur introuvable");
    }
    user.is_active = true;
    return user;
  },

  deactivateUser: async (id: number): Promise<User> => {
    await delay(300);
    const user = users.find((u) => u.id === id);
    if (!user) {
      throw new Error("Utilisateur introuvable");
    }
    user.is_active = false;
    return user;
  },
};

