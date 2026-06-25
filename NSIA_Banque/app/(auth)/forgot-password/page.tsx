"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { passwordResetApi } from "@/lib/api/passwordReset";

const forgotPasswordSchema = z.object({
  email: z.string().email("Veuillez entrer une adresse email valide"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await passwordResetApi.requestReset({ email: data.email });
      setIsSuccess(true);
    } catch (error: any) {
      // Extraire le message d'erreur
      let msg = "Une erreur est survenue. Veuillez réessayer plus tard.";

      if (error?.response?.data) {
        const resData = error.response.data;
        if (resData.detail) {
          msg = resData.detail;
        } else if (resData.email) {
          msg = Array.isArray(resData.email) ? resData.email.join(", ") : resData.email;
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

  // Vue succès
  if (isSuccess) {
    return (
      <div className="w-full">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Email envoyé
          </h2>
          <p className="text-gray-600 mb-2">
            Si un compte existe avec l'adresse
          </p>
          <p className="text-gray-900 font-medium mb-4">
            {getValues("email")}
          </p>
          <p className="text-gray-600 mb-8">
            vous recevrez un lien de réinitialisation dans quelques instants.
            Vérifiez également vos spams.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Le lien expire dans <span className="font-semibold text-gray-700">15 minutes</span>.
            </p>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full h-12 text-base font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          Mot de passe oublié
        </h2>
        <p className="text-gray-600">
          Entrez votre adresse email et nous vous enverrons un lien pour
          réinitialiser votre mot de passe.
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
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Adresse email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="votre.email@exemple.com"
              className="pl-10 h-12"
              {...register("email")}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>•</span>
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer le lien de réinitialisation"
          )}
        </Button>
      </form>

      {/* Info */}
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              Besoin d'aide ?
            </p>
            <p className="text-xs text-blue-700">
              Si vous ne recevez pas d'email, contactez votre administrateur ou
              le support NSIA Vie Assurances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
