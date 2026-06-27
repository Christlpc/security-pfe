import { ROLES } from "./constants";
import type { UserRole } from "@/types";

/**
 * Liste des rôles administrateurs qui ont accès aux fonctionnalités de gestion
 */
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA] as const;

/**
 * Vérifie si un rôle est un rôle administrateur
 */
export function isAdmin(role?: UserRole | null): boolean {
    if (!role) return false;
    return ADMIN_ROLES.includes(role as any);
}

/**
 * Vérifie si l'utilisateur peut gérer les banques (CRUD)
 */
export function canManageBanques(role?: UserRole | null): boolean {
    return isAdmin(role);
}

/**
 * Vérifie si l'utilisateur peut gérer les utilisateurs (CRUD)
 */
export function canManageUsers(role?: UserRole | null): boolean {
    if (!role) return false;
    return isAdmin(role) || role === ROLES.RESPONSABLE_BANQUE;
}

/**
 * Vérifie si l'utilisateur peut accéder aux paramètres avancés
 */
export function canAccessSettings(role?: UserRole | null): boolean {
    return isAdmin(role);
}

/**
 * Vérifie si l'utilisateur peut voir les statistiques globales
 */
export function canViewGlobalStats(role?: UserRole | null): boolean {
    return isAdmin(role);
}

/**
 * Vérifie si l'utilisateur peut gérer les agences (CRUD)
 */
export function canManageAgences(role?: UserRole | null): boolean {
    if (!role) return false;
    return isAdmin(role) || role === ROLES.RESPONSABLE_BANQUE;
}
