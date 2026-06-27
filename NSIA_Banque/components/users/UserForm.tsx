"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/lib/store/userStore";
import { UserCreateData, UserUpdateData } from "@/lib/api/users";
import { ROLES } from "@/lib/utils/constants";
import { getRoleDisplayName } from "@/lib/utils/theme";
import { useAuthStore } from "@/lib/store/authStore";
import { useBanques, useResourceCache } from "@/lib/providers/ResourceProvider";
import { cn } from "@/lib/utils";
import type { User, UserRole, Agence } from "@/types";
import toast from "react-hot-toast";

// Schéma de validation
const userSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().optional(),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  role: z.string().min(1, "Le rôle est requis"),
  banque: z.union([z.string(), z.number()]).optional().nullable(),
  agence: z.string().optional().nullable(),
  matricule: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserForm({ user, open, onOpenChange }: UserFormProps) {
  const { createUser, updateUser, fetchUsers, filters } = useUserStore();
  const { user: currentUser } = useAuthStore();

  // Use cached resources from ResourceProvider (loaded at app start)
  const { banques } = useBanques();
  const { getAgencesByBanque, isLoading: loadingAgences } = useResourceCache();
  const [agences, setAgences] = useState<Agence[]>([]);
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      password: "",
      nom: user?.nom || "",
      prenom: user?.prenom || "",
      role: user?.role || "GESTIONNAIRE",
      banque: user?.banque?.id || currentUser?.banque?.id || undefined,
      agence: (user as any)?.agence?.id || (user as any)?.agence || undefined,
      matricule: user?.matricule || "",
      telephone: user?.telephone || "",
      is_active: user?.is_active !== false,
    },
  });

  const selectedRole = watch("role");
  const selectedBanque = watch("banque");
  const selectedAgence = watch("agence");

  // Filter agencies from cache when bank is selected (instant, no API call)
  useEffect(() => {
    if (!selectedBanque) {
      setAgences([]);
      return;
    }
    // Get agencies for selected bank from cache
    const filteredAgences = getAgencesByBanque(selectedBanque);
    setAgences(filteredAgences);
    console.log("[UserForm] Agences from cache:", filteredAgences.length, "for banque", selectedBanque);
  }, [selectedBanque, getAgencesByBanque]);

  useEffect(() => {
    if (user) {
      reset({
        username: user.username || "",
        email: user.email,
        password: "",
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        banque: user.banque?.id || undefined,
        agence: (user as any)?.agence?.id || (user as any)?.agence || undefined,
        matricule: user.matricule || "",
        telephone: user.telephone || "",
        is_active: user.is_active !== false,
      });
    } else {
      reset({
        username: "",
        email: "",
        password: "",
        nom: "",
        prenom: "",
        role: "GESTIONNAIRE",
        banque: currentUser?.banque?.id || undefined,
        agence: undefined,
        matricule: "",
        telephone: "",
        is_active: true,
      });
    }
  }, [user, reset, currentUser]);

  const onSubmit = async (data: UserFormData) => {
    // Validation de banque obligatoire pour les rôles banque (Responsable et Gestionnaire)
    const needsBanque = data.role === ROLES.RESPONSABLE_BANQUE || data.role === ROLES.GESTIONNAIRE;
    if (needsBanque && (!data.banque || data.banque === "" || data.banque === 0)) {
      toast.error("Veuillez sélectionner une banque");
      setValue("banque", undefined as any, { shouldValidate: true });
      return;
    }
    // Validation d'agence obligatoire uniquement pour le rôle GESTIONNAIRE
    const needsAgence = data.role === ROLES.GESTIONNAIRE;
    if (needsAgence && (!data.agence || data.agence === "")) {
      toast.error("Veuillez sélectionner une agence");
      return;
    }

    try {
      if (isEditing && user) {
        const updateData: UserUpdateData = {
          username: data.username,
          email: data.email,
          nom: data.nom,
          prenom: data.prenom,
          role: data.role as UserRole,
          banque: data.banque || undefined,
          agence: data.agence || undefined,
          matricule: data.matricule || undefined,
          telephone: data.telephone || undefined,
          is_active: data.is_active,
        };
        // Si un nouveau mot de passe est fourni
        if (data.password && data.password.length >= 8) {
          (updateData as any).password = data.password;
        }
        await updateUser(user.id as number, updateData);
      } else {
        const createData: UserCreateData = {
          username: data.username,
          email: data.email,
          nom: data.nom,
          prenom: data.prenom,
          role: data.role as UserRole,
          banque: data.banque || undefined,
          agence: data.agence || undefined,
          matricule: data.matricule || undefined,
          telephone: data.telephone || undefined,
          is_active: data.is_active !== false,
        };
        await createUser(createData);
      }
      onOpenChange(false);
      fetchUsers(filters);
    } catch (error: any) {
      // Erreur gérée par le store
    }
  };

  const currentUserRole = currentUser?.role;
  const roleOptions = [
    { value: ROLES.SUPER_ADMIN_NSIA, label: getRoleDisplayName(ROLES.SUPER_ADMIN_NSIA) },
    { value: ROLES.ADMIN_NSIA, label: getRoleDisplayName(ROLES.ADMIN_NSIA) },
    { value: ROLES.RESPONSABLE_BANQUE, label: getRoleDisplayName(ROLES.RESPONSABLE_BANQUE) },
    { value: ROLES.GESTIONNAIRE, label: getRoleDisplayName(ROLES.GESTIONNAIRE) },
    { value: ROLES.SUPPORT, label: getRoleDisplayName(ROLES.SUPPORT) },
  ].filter(option => {
    if (currentUserRole === ROLES.SUPER_ADMIN_NSIA) {
      return true;
    }
    if (currentUserRole === ROLES.ADMIN_NSIA) {
      return option.value !== ROLES.SUPER_ADMIN_NSIA;
    }
    if (currentUserRole === ROLES.RESPONSABLE_BANQUE) {
      // Bank admin can only create agents (GESTIONNAIRE)
      return option.value === ROLES.GESTIONNAIRE;
    }
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de l'utilisateur ci-dessous"
              : "Remplissez le formulaire pour créer un nouvel utilisateur dans le système"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)] flex-1">
            <div className="space-y-6">
              {/* Nom d'utilisateur */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                  Nom d'utilisateur *
                </Label>
                <Input
                  id="username"
                  {...register("username")}
                  placeholder="jean.dupont"
                  className={cn(
                    "transition-all",
                    errors.username ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                  )}
                />
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-sm font-semibold text-gray-700">
                    Prénom *
                  </Label>
                  <Input
                    id="prenom"
                    {...register("prenom")}
                    placeholder="Jean"
                    className={cn(
                      "transition-all",
                      errors.prenom ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                  />
                  {errors.prenom && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.prenom.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-semibold text-gray-700">
                    Nom *
                  </Label>
                  <Input
                    id="nom"
                    {...register("nom")}
                    placeholder="Dupont"
                    className={cn(
                      "transition-all",
                      errors.nom ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                  />
                  {errors.nom && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.nom.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="jean.dupont@example.com"
                  className={cn(
                    "transition-all",
                    errors.email ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                    Rôle *
                  </Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setValue("role", value as UserRole)}
                  >
                    <SelectTrigger
                      className={cn(
                        "transition-all",
                        errors.role ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                      )}
                    >
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {(currentUser?.role === ROLES.SUPER_ADMIN_NSIA || currentUser?.role === ROLES.ADMIN_NSIA) &&
                 (selectedRole === ROLES.RESPONSABLE_BANQUE || selectedRole === ROLES.GESTIONNAIRE) && (
                  <div className="space-y-2">
                    <Label htmlFor="banque" className="text-sm font-semibold text-gray-700">
                      Banque *
                    </Label>
                    <Select
                      value={selectedBanque ? String(selectedBanque) : ""}
                      onValueChange={(value) => {
                        if (value && value.trim() !== "") {
                          setValue("banque", value, { shouldValidate: true });
                        } else {
                          setValue("banque", undefined as any, { shouldValidate: true });
                        }
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "transition-all",
                          errors.banque ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                        )}
                      >
                        <SelectValue placeholder="Sélectionner une banque" />
                      </SelectTrigger>
                      <SelectContent>
                        {banques.filter((banque) => banque.id).length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-gray-500">
                            Aucune banque disponible
                          </div>
                        ) : (
                          banques
                            .filter((banque) => banque.id)
                            .map((banque) => (
                              <SelectItem key={String(banque.id)} value={String(banque.id)}>
                                {banque.nom || `Banque ${banque.id}`}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.banque && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <span>•</span>
                        {errors.banque.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Agency Selection - Shows when bank is selected/available and role is GESTIONNAIRE */}
              {selectedBanque && selectedRole === ROLES.GESTIONNAIRE && (
                <div className="space-y-2">
                  <Label htmlFor="agence" className="text-sm font-semibold text-gray-700">
                    Agence *
                  </Label>
                  <Select
                    value={selectedAgence || ""}
                    onValueChange={(value) => {
                      if (value && value.trim() !== "") {
                        setValue("agence", value, { shouldValidate: true });
                      } else {
                        setValue("agence", undefined as any, { shouldValidate: true });
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "transition-all",
                        errors.agence ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                      )}
                    >
                      <SelectValue placeholder={loadingAgences ? "Chargement..." : "Sélectionner une agence"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingAgences ? (
                        <div className="px-2 py-4 text-center text-sm text-gray-500">
                          Chargement des agences...
                        </div>
                      ) : agences.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-gray-500">
                          Aucune agence pour cette banque
                        </div>
                      ) : (
                        agences.map((agence) => (
                          <SelectItem key={agence.id} value={agence.id}>
                            {agence.nom} ({agence.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.agence && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.agence.message}
                    </p>
                  )}
                </div>
              )}

              {/* Matricule et Téléphone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="matricule" className="text-sm font-semibold text-gray-700">
                    Matricule
                  </Label>
                  <Input
                    id="matricule"
                    {...register("matricule")}
                    placeholder="MAT-001"
                    className={cn(
                      "transition-all",
                      errors.matricule ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                    maxLength={50}
                  />
                  {errors.matricule && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.matricule.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-semibold text-gray-700">
                    Téléphone
                  </Label>
                  <Input
                    id="telephone"
                    {...register("telephone")}
                    placeholder="+242 06 123 45 67"
                    className={cn(
                      "transition-all",
                      errors.telephone ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                    maxLength={20}
                  />
                  {errors.telephone && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={watch("is_active")}
                    onChange={(e) => setValue("is_active", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Utilisateur actif
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Enregistrement...
                </span>
              ) : isEditing ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

