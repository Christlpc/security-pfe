"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { passwordResetApi } from "@/lib/api/passwordReset";

const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirm_password: z.string().min(1, "Veuillez confirmer le mot de passe"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const newPassword = watch("new_password") || "";

  // Indicateurs de robustesse du mot de passe
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };

  const strengthScore = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabel =
    strengthScore === 0
      ? ""
      : strengthScore <= 2
        ? "Faible"
        : strengthScore === 3
          ? "Moyen"
          : "Fort";
  const strengthColor =
    strengthScore <= 2
      ? "bg-red-500"
      : strengthScore === 3
        ? "bg-yellow-500"
        : "bg-green-500";

  // Pas de token = lien invalide
  if (!token) {
    return (
      <div className="w-full">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Lien invalide
          </h2>
          <p className="text-gray-600 mb-8">
            Ce lien de réinitialisation est invalide ou a expiré.
            Veuillez faire une nouvelle demande.
          </p>
          <div className="space-y-3">
            <Link href="/forgot-password">
              <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Nouvelle demande
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full h-12 text-base font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Vue succès
  if (isSuccess) {
    return (
      <div className="w-full">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Mot de passe modifié
          </h2>
          <p className="text-gray-600 mb-8">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez
            maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Link href="/login">
            <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              Se connecter
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await passwordResetApi.confirmReset({
        token: token!,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });
      setIsSuccess(true);
    } catch (error: any) {
      let msg = "Une erreur est survenue. Le lien a peut-être expiré.";

      if (error?.response?.data) {
        const resData = error.response.data;
        if (resData.detail) {
          msg = resData.detail;
        } else if (resData.token) {
          msg = Array.isArray(resData.token) ? resData.token.join(", ") : resData.token;
        } else if (resData.new_password) {
          msg = Array.isArray(resData.new_password)
            ? resData.new_password.join(", ")
            : resData.new_password;
        } else if (resData.confirm_password) {
          msg = Array.isArray(resData.confirm_password)
            ? resData.confirm_password.join(", ")
            : resData.confirm_password;
        } else if (resData.non_field_errors) {
          msg = Array.isArray(resData.non_field_errors)
            ? resData.non_field_errors.join(", ")
            : resData.non_field_errors;
        }
      } else if (error?.message) {
        msg = error.message;
      }

      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour à la connexion
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nouveau mot de passe
        </h2>
        <p className="text-gray-600">
          Choisissez un mot de passe sécurisé pour votre compte.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="new_password" className="text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="new_password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 h-12"
              {...register("new_password")}
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>•</span>
              {errors.new_password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  strengthScore <= 2 ? "text-red-600" : strengthScore === 3 ? "text-yellow-600" : "text-green-600"
                }`}>
                  {strengthLabel}
                </span>
              </div>
              <ul className="space-y-1">
                {[
                  { check: passwordChecks.length, label: "Au moins 8 caractères" },
                  { check: passwordChecks.uppercase, label: "Une lettre majuscule" },
                  { check: passwordChecks.lowercase, label: "Une lettre minuscule" },
                  { check: passwordChecks.number, label: "Un chiffre" },
                ].map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-2 text-xs ${
                      item.check ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      item.check ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      {item.check ? (
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                      )}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 h-12"
              {...register("confirm_password")}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>•</span>
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isSubmitting || strengthScore < 4}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Réinitialisation en cours...
            </>
          ) : (
            "Réinitialiser le mot de passe"
          )}
        </Button>
      </form>

      {/* Security Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              Sécurité
            </p>
            <p className="text-xs text-blue-700">
              Ce lien expire dans 15 minutes et ne peut être utilisé qu'une seule
              fois. Ne partagez jamais ce lien avec quelqu'un d'autre.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
