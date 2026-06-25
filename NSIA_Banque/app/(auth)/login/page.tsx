"use client";

import { useState } from "react";
import Link from "next/link";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur ou l'email est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useSafeRouter();
  const { login, isLoading } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null); // Réinitialiser l'erreur
    try {
      await login(data);
      toast.success("Connexion réussie");
      router.push("/");
    } catch (error: any) {
      // Extraire le message d'erreur de la réponse API
      let errorMessage = "Identifiants incorrects. Veuillez vérifier votre nom d'utilisateur et mot de passe.";

      if (error?.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors)
            ? data.non_field_errors.join(", ")
            : data.non_field_errors;
        } else if (data.username) {
          errorMessage = `Nom d'utilisateur: ${Array.isArray(data.username) ? data.username.join(", ") : data.username}`;
        } else if (data.password) {
          errorMessage = `Mot de passe: ${Array.isArray(data.password) ? data.password.join(", ") : data.password}`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connexion à votre compte
        </h2>
        <p className="text-gray-600">
          Entrez vos identifiants pour accéder à la plateforme
        </p>
      </div>

      {/* Error Alert */}
      {loginError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erreur de connexion</p>
            <p className="text-sm text-red-700 mt-1">{loginError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-gray-700">
            Nom d'utilisateur ou email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="username"
              type="text"
              placeholder="nom.utilisateur ou email@exemple.com"
              className="pl-10 h-12"
              {...register("username")}
              disabled={isLoading}
            />
          </div>
          {errors.username && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>•</span>
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Mot de passe
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 h-12"
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>•</span>
              {errors.password.message}
            </p>
          )}
          <div className="flex justify-end mt-1">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">Sécurisé et confidentiel</span>
        </div>
      </div>

      {/* Security Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
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
              Connexion sécurisée
            </p>
            <p className="text-xs text-blue-700">
              Vos identifiants sont chiffrés et protégés. Nous utilisons les dernières
              technologies de sécurité pour protéger vos données.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

