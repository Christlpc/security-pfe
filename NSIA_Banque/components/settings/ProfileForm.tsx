"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/store/authStore";
import { profileApi, type ProfileUpdateData } from "@/lib/api/profile";
import { Avatar } from "@/components/ui/avatar";
import { User, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";

const profileSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est requis").optional(),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  email: z.string().email("Email invalide"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { user, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      nom: user?.nom || "",
      prenom: user?.prenom || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const updateData: ProfileUpdateData = {
        username: data.username,
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
      };

      const updatedUser = await profileApi.updateProfile(updateData);
      setUser(updatedUser);
      toast.success("Profil mis à jour avec succès");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la mise à jour du profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-50">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Informations du Profil</CardTitle>
            <CardDescription>Modifiez vos informations personnelles</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6 mb-6 pb-6 border-b">
          <Avatar
            name={`${user.prenom} ${user.nom}`}
            email={user.email}
            size="lg"
            showStatus
            isActive={true}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {user.prenom} {user.nom}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            <p className="text-xs text-gray-400 mt-2">
              Votre photo de profil est générée automatiquement à partir de vos initiales
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="prenom" className="text-sm font-semibold text-gray-700">
                Prénom *
              </Label>
              <Input
                id="prenom"
                {...register("prenom")}
                className={cn(
                  "transition-all",
                  errors.prenom ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
              />
              {errors.prenom && (
                <p className="text-sm text-red-600 mt-1">{errors.prenom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom" className="text-sm font-semibold text-gray-700">
                Nom *
              </Label>
              <Input
                id="nom"
                {...register("nom")}
                className={cn(
                  "transition-all",
                  errors.nom ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
              />
              {errors.nom && (
                <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                {...register("username")}
                className={cn(
                  "transition-all",
                  errors.username ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
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
              className={cn(
                "transition-all",
                errors.email ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
              )}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

