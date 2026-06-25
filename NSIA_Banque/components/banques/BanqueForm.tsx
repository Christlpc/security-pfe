"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { banqueApi } from "@/lib/api/banques";
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
import { Label } from "@/components/ui/label";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker";
import { PRODUIT_LABELS, type ProduitType, type Banque } from "@/types";
import { ALL_PRODUITS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const banqueSchema = z.object({
  nom: z.string().min(1, "Le nom complet est requis"),
  nom_court: z.string().min(1, "Le nom court est requis").max(50, "Le nom court doit faire moins de 50 caractères"),
  code: z.string().min(1, "Le code est requis").max(20, "Le code doit faire moins de 20 caractères"),
  email: z.string().email("Email invalide").min(1, "L'email de contact est requis"),
  telephone: z.string().min(1, "Le téléphone de contact est requis"),
  adresse: z.string().min(1, "L'adresse est requise"),
  couleur_primaire: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide (#RRGGBB)").optional(),
  couleur_secondaire: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide (#RRGGBB)").optional(),
  produits_disponibles: z.array(z.enum([
    "emprunteur",
    "confort_retraite",
    "confort_etudes",
    "elikia_scolaire",
    "mobateli",
    "epargne_plus",
  ])).optional(),
  date_partenariat: z.string().optional(),
});

type BanqueFormData = z.infer<typeof banqueSchema>;

interface BanqueFormProps {
  banque?: Banque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function BanqueForm({ banque, open, onOpenChange }: BanqueFormProps) {
  const { updateBanque, createBanque, fetchBanques } = useBanqueStore();
  const isEditing = !!banque;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<BanqueFormData>({
    resolver: zodResolver(banqueSchema),
    defaultValues: {
      nom: banque?.nom || "",
      nom_court: banque?.nom_court || banque?.code || "",
      code: banque?.code || "",
      email: banque?.email || "",
      telephone: banque?.telephone || "",
      adresse: banque?.adresse || "",
      couleur_primaire: banque?.couleur_primaire || "#003366",
      couleur_secondaire: banque?.couleur_secondaire || "#FFD700",
      produits_disponibles: banque?.produits_disponibles || [],
      date_partenariat: banque?.date_partenariat || "",
    },
  });

  const selectedProduits = watch("produits_disponibles");

  useEffect(() => {
    if (banque) {
      reset({
        nom: banque.nom,
        nom_court: banque.nom_court || banque.code,
        code: banque.code,
        email: banque.email || "",
        telephone: banque.telephone || "",
        adresse: banque.adresse || "",
        couleur_primaire: banque.couleur_primaire || "#003366",
        couleur_secondaire: banque.couleur_secondaire || "#FFD700",
        produits_disponibles: banque.produits_disponibles || [],
        date_partenariat: banque.date_partenariat || "",
      });
      setLogoFile(null);
      setLogoPreview(null);

      // Charger les produits réels depuis l'API car ils ne sont pas dans l'objet banque liste
      const loadProduits = async () => {
        try {
          const produits = await banqueApi.getBanqueProduits(banque.id);
          // On s'assure que ce sont des ProduitType valides
          if (Array.isArray(produits)) {
            const validProduits = produits.filter((p: string) => ALL_PRODUITS.includes(p as ProduitType)) as ProduitType[];
            setValue("produits_disponibles", validProduits);
            console.log("[BanqueForm] Produits chargés:", validProduits);
          }
        } catch (error) {
          console.error("[BanqueForm] Erreur chargement produits:", error);
          toast.error("Impossible de charger les produits de la banque");
        }
      };
      loadProduits();

    } else {
      reset({
        nom: "",
        nom_court: "",
        code: "",
        email: "",
        telephone: "",
        adresse: "",
        couleur_primaire: "#003366",
        couleur_secondaire: "#FFD700",
        produits_disponibles: [],
        date_partenariat: "",
      });
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [banque, reset]);

  // Gérer le changement de fichier logo
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner une image (PNG, JPG, SVG)");
        return;
      }
      // Vérifier la taille (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 2 Mo");
        return;
      }
      setLogoFile(file);
      // Créer une preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleProduit = (produit: ProduitType) => {
    const current = selectedProduits || [];
    if (current.includes(produit)) {
      setValue("produits_disponibles", current.filter((p) => p !== produit));
    } else {
      setValue("produits_disponibles", [...current, produit]);
    }
  };

  const onSubmit = async (data: BanqueFormData) => {
    try {
      // Préparer les paramètres spécifiques
      const existingParams = banque?.parametres_specifiques || {};
      const newParams: Record<string, any> = { ...existingParams };

      // Si un nouveau logo est sélectionné, on l'ajoute en base64 aux paramètres
      // C'est un fallback car l'upload de fichier standard semble échouer côté serveur
      if (logoFile && logoPreview) {
        newParams.logo_base64 = logoPreview;
      }

      if (isEditing && banque) {
        await updateBanque(banque.id, {
          nom: data.nom,
          nom_court: data.nom_court,
          code: data.code,
          email: data.email,
          telephone: data.telephone,
          adresse: data.adresse,
          logo: logoFile || undefined, // On envoie quand même le fichier au cas où
          couleur_primaire: data.couleur_primaire,
          couleur_secondaire: data.couleur_secondaire,
          produits_disponibles: data.produits_disponibles,
          date_partenariat: data.date_partenariat || undefined,
          parametres_specifiques: newParams,
        });
        await fetchBanques(); // Rafraîchir la liste
        onOpenChange(false);
      } else {
        // Création d'une nouvelle banque
        await createBanque({
          nom: data.nom,
          nom_court: data.nom_court,
          code: data.code,
          email: data.email,
          telephone: data.telephone,
          adresse: data.adresse,
          logo: logoFile || undefined,
          couleur_primaire: data.couleur_primaire,
          couleur_secondaire: data.couleur_secondaire,
          produits_disponibles: data.produits_disponibles,
          date_partenariat: data.date_partenariat || undefined,
          parametres_specifiques: newParams,
        });
        await fetchBanques(); // Rafraîchir la liste
        onOpenChange(false);
      }
    } catch (error: any) {
      // L'erreur est déjà gérée par le store avec toast
      // On ne fait rien ici pour éviter de dupliquer les messages
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la banque" : "Créer une nouvelle banque"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de la banque"
              : "Remplissez le formulaire pour créer une nouvelle banque"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)] flex-1">
            <div className="space-y-6">
              {/* Nom complet */}
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-semibold text-gray-700">
                  Nom complet de la banque *
                </Label>
                <Input
                  id="nom"
                  {...register("nom")}
                  placeholder="Ecobank Congo"
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

              {/* Logo de la banque */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Logo de la banque
                </Label>
                <div className="flex items-start gap-4">
                  {/* Zone de preview */}
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="relative w-24 h-24 rounded-lg border-2 border-gray-200 overflow-hidden bg-white">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Zone d'upload */}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500 text-center">
                          <span className="font-semibold text-blue-600">Cliquez pour importer</span>
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG ou SVG (max. 2 Mo)</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nom court */}
                <div className="space-y-2">
                  <Label htmlFor="nom_court" className="text-sm font-semibold text-gray-700">
                    Nom court *
                  </Label>
                  <Input
                    id="nom_court"
                    {...register("nom_court")}
                    placeholder="Ecobank"
                    className={cn(
                      "transition-all",
                      errors.nom_court ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                    maxLength={50}
                  />
                  {errors.nom_court && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.nom_court.message}
                    </p>
                  )}
                </div>

                {/* Code banque */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-semibold text-gray-700">
                    Code banque *
                  </Label>
                  <Input
                    id="code"
                    {...register("code")}
                    placeholder="ECO"
                    className={cn(
                      "transition-all uppercase",
                      errors.code ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                    maxLength={20}
                  />
                  {errors.code && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.code.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email de contact *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="contact@banque.cg"
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

                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-semibold text-gray-700">
                    Téléphone de contact *
                  </Label>
                  <Input
                    id="telephone"
                    {...register("telephone")}
                    placeholder="+242 06 234 56 78"
                    className={cn(
                      "transition-all",
                      errors.telephone ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    )}
                  />
                  {errors.telephone && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-sm font-semibold text-gray-700">
                  Adresse *
                </Label>
                <Input
                  id="adresse"
                  {...register("adresse")}
                  placeholder="Brazzaville, Congo"
                  className={cn(
                    "transition-all",
                    errors.adresse ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                  )}
                />
                {errors.adresse && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.adresse.message}
                  </p>
                )}
              </div>

              {/* Couleurs de la banque */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="couleur_primaire" className="text-sm font-semibold text-gray-700">
                    Couleur primaire
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="couleur_primaire"
                      {...register("couleur_primaire")}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={watch("couleur_primaire") || "#003366"}
                      onChange={(e) => setValue("couleur_primaire", e.target.value)}
                      placeholder="#003366"
                      className="flex-1 uppercase"
                      maxLength={7}
                    />
                  </div>
                  {errors.couleur_primaire && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.couleur_primaire.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="couleur_secondaire" className="text-sm font-semibold text-gray-700">
                    Couleur secondaire
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="couleur_secondaire"
                      {...register("couleur_secondaire")}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={watch("couleur_secondaire") || "#FFD700"}
                      onChange={(e) => setValue("couleur_secondaire", e.target.value)}
                      placeholder="#FFD700"
                      className="flex-1 uppercase"
                      maxLength={7}
                    />
                  </div>
                  {errors.couleur_secondaire && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>•</span>
                      {errors.couleur_secondaire.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_partenariat" className="text-sm font-semibold text-gray-700">
                  Date de partenariat
                </Label>
                <DatePickerInput
                  id="date_partenariat"
                  value={watch("date_partenariat") || undefined}
                  onChange={(value) => setValue("date_partenariat", value)}
                  placeholder="Sélectionner une date"
                  disabled={isSubmitting}
                  error={!!errors.date_partenariat}
                  maxDate={new Date()}
                />
                {errors.date_partenariat && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.date_partenariat.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Produits disponibles *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_PRODUITS.map((produit) => {
                    const isSelected = selectedProduits?.includes(produit);
                    return (
                      <button
                        key={produit}
                        type="button"
                        onClick={() => toggleProduit(produit)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-900"
                            : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-4 w-4 rounded border-2 flex items-center justify-center transition-all",
                              isSelected
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300"
                            )}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium">{PRODUIT_LABELS[produit]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.produits_disponibles && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.produits_disponibles.message}
                  </p>
                )}
              </div>
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

