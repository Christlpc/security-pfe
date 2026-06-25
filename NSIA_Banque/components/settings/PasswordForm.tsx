"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileApi, type PasswordChangeData } from "@/lib/api/profile";
import { Lock, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "L'ancien mot de passe est requis"),
    new_password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirm_password: z.string().min(1, "La confirmation est requise"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function PasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      const changeData: PasswordChangeData = {
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      };

      await profileApi.changePassword(changeData);
      toast.success("Mot de passe modifié avec succès");
      reset();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-orange-50">
            <Lock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Sécurité</CardTitle>
            <CardDescription>Modifiez votre mot de passe</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="old_password" className="text-sm font-semibold text-gray-700">
              Ancien mot de passe *
            </Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showOldPassword ? "text" : "password"}
                {...register("old_password")}
                className={cn(
                  "transition-all pr-10",
                  errors.old_password ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.old_password && (
              <p className="text-sm text-red-600 mt-1">{errors.old_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-sm font-semibold text-gray-700">
              Nouveau mot de passe *
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? "text" : "password"}
                {...register("new_password")}
                className={cn(
                  "transition-all pr-10",
                  errors.new_password ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
                placeholder="Minimum 8 caractères"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-sm text-red-600 mt-1">{errors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm font-semibold text-gray-700">
              Confirmer le nouveau mot de passe *
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirm_password")}
                className={cn(
                  "transition-all pr-10",
                  errors.confirm_password ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-sm text-red-600 mt-1">{errors.confirm_password.message}</p>
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




