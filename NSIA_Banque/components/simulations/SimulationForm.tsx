"use client";

import { useState, useEffect, useMemo } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { getProduct } from "@/src/domain/products/index";
import { BaseProductSchema } from "@/src/domain/products/base/Product";
import { BENEFICIARY_QUALITES, Beneficiary } from "@/src/domain/beneficiaries/Beneficiary";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeneficiarySection } from "@/src/components/simulations/sections/BeneficiarySection";
import { ElikiaSection } from "@/src/components/simulations/sections/ElikiaSection";
import { ConfortRetraiteSection } from "@/src/components/simulations/sections/ConfortRetraiteSection";
import { MobateliSection } from "@/src/components/simulations/sections/MobateliSection";
import { EmprunteurSection } from "@/src/components/simulations/sections/EmprunteurSection";
import { ConfortEtudesSection } from "@/src/components/simulations/sections/ConfortEtudesSection";
import { EpargnePlusSection } from "@/src/components/simulations/sections/EpargnePlusSection";
import { formatNumberWithSpaces, parseFormattedNumber, formatCurrency } from "@/lib/utils/format";
import { formatCFA } from "@/src/presentation/shared/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePickerInput } from "@/components/ui/date-picker";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { Banque, PRODUIT_LABELS, ProduitType, QuestionnaireMedical } from "@/types";
import { useAuthStore } from "@/lib/store/authStore";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { ALL_PRODUITS } from "@/lib/utils/constants";
import toast from "react-hot-toast";
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, UserCircle, Mail, Phone, GraduationCap, Building2, Briefcase, PiggyBank, HandCoins, User, FileText, Shield, Heart, DollarSign, AlertCircle, Plus, Trash2, Users, Check } from "lucide-react";
import { SimulationStepper, StepCard, StepSectionHeader, StepContainer, StepNavigation } from "@/components/simulations/SimulationStepper";
import { MedicalForm, MEDICAL_QUESTIONS } from "@/components/questionnaire/MedicalForm";
import { questionnairesApi, exportsApi } from "@/lib/api/simulations";
import { calculateRealAge, formatDateFull } from "@/lib/utils/date";
import { elikiaProduct } from "@/src/domain/products/elikia-scolaire/ElikiaProduct";

// Helper to format numbers with thousand separators (French format)
// Helper functions imported from @/lib/utils/format

const simulationSchema = z.object({
  // ── Identité client ──────────────────────────────────────────
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  titre_assure: z.any(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  date_naissance: z.string().min(1, "La date de naissance est requise"),
  lieu_naissance: z.any(),
  nationalite: z.string().optional().or(z.literal("")),
  type_piece_identite: z.string().optional().or(z.literal("")),
  numero_piece_identite: z.string().optional().or(z.literal("")),
  situation_matrimoniale: z.string().min(1, "La situation matrimoniale est requise"),

  // ── Coordonnées ──────────────────────────────────────────────
  // Cellulaire (principal) — obligatoire, format Congo
  telephone: z.string()
    .min(1, "Le téléphone est requis")
    .regex(/^(06|05|04|01)\d{7}$/, "Format invalide. Ex: 067007070 (06, 05, 04 ou 01 suivi de 7 chiffres)"),
  telephone_domicile: z.string().optional().or(z.literal("")),
  telephone_bureau: z.string().optional().or(z.literal("")),
  adresse: z.string().min(1, "L'adresse postale est requise"),
  adresse_geographique: z.string().optional().or(z.literal("")),

  // ── Activité professionnelle ─────────────────────────────────
  profession: z.string().min(1, "La profession est requise"),
  employeur: z.string().min(1, "L'employeur est requis"),
  poste: z.string().optional().or(z.literal("")),
  adresse_employeur: z.string().optional().or(z.literal("")),
  telephone_employeur: z.string().optional().or(z.literal("")),

  // ── Compte bancaire ──────────────────────────────────────────
  numero_compte: z.string().min(1, "Le numéro de compte est requis"),

  // ── Correspondant (personne à contacter si l'assuré est injoignable) ──
  correspondant_nom: z.string().optional().or(z.literal("")),
  correspondant_prenom: z.string().optional().or(z.literal("")),
  correspondant_adresse: z.string().optional().or(z.literal("")),
  correspondant_telephone: z.string().optional().or(z.literal("")),
  correspondant_cellulaire: z.string().optional().or(z.literal("")),

  // ── Champs produit (validés manuellement en Step 2) ──────────
  montant_pret: z.any(),
  duree_mois: z.any(),
  rente_annuelle: z.any(),
  age_parent: z.any(),
  duree_rente: z.any(),

  // Confort Etudes
  age_enfant: z.any(),
  montant_rente: z.any(),
  duree_paiement: z.any(),
  duree_service: z.any(),

  // Mobateli
  capital_dtc_iad: z.any(),
  age: z.any(),
  mode_calcul: z.any(),
  volet: z.any(),
  prime_souhaitee: z.any(),
  duree_sur_mesure: z.any(),
  type_prime: z.any(),
  capital_sur_mesure: z.any(),
  date_souscription: z.any(),

  // Confort Retraite
  prime_periodique_commerciale: z.any(),
  capital_deces: z.any(),
  duree: z.any(),
  periodicite: z.any(),

  taux_surprime: z.any(),

  // Emprunteur specific fields - all bypass validation for non-emprunteur products
  numero_convention: z.any(),
  type_pret: z.any(),
  taux_interet: z.any(),
  date_octroi: z.any(),
  date_effet: z.any(),
  date_premiere_echeance: z.any(),
  date_premiere_cotisation: z.any(),

  // Modalités de paiement
  mode_paiement: z.any(),
  origine_fonds: z.any(),

  // Champs manquants ajoutés pour Elikia/Mobateli
  date_signature: z.any(),
  date_fin: z.any(),
  duree_engagement: z.any(),
  dates_renouvellement: z.any(),

  // Epargne Plus fields
  cotisation_mensuelle: z.any(),
  duree_annees: z.any(),
  numero_compte_cle: z.any(),
  deja_souscrit_nsia: z.any(),
  contrats_nsia_existants: z.any(),
  avec_details: z.any(),
}).refine((data) => {
  return true;
});

type SimulationFormData = z.infer<typeof simulationSchema>;

interface SimulationFormProps {
  mode?: "create" | "edit";
}

export function SimulationForm({ mode = "create" }: SimulationFormProps) {
  // Helper for icons
  const getProductIcon = (product: ProduitType) => {
    switch (product) {
      case "elikia_scolaire": return <GraduationCap className="w-6 h-6" />;
      case "emprunteur": return <Building2 className="w-6 h-6" />;
      case "confort_etudes": return <Briefcase className="w-6 h-6" />;
      case "confort_retraite": return <PiggyBank className="w-6 h-6" />;
      case "mobateli": return <HandCoins className="w-6 h-6" />;
      case "epargne_plus": return <PiggyBank className="w-6 h-6" />; // Reuse piggy bank
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  const router = useSafeRouter();
  const { user } = useAuthStore();
  const { getLabel } = useProductLabels();
  const {
    createSimulation,
    updateSimulation,
    isLoading,
    wizardData,
    setWizardStep,
    updateWizardData,
    resetWizard
  } = useSimulationStore();

  const [selectedProduct, setSelectedProduct] = useState<ProduitType | "">("");
  const beneficiaryConfig = useMemo(() => selectedProduct ? getProduct(selectedProduct)?.beneficiaryConfig : null, [selectedProduct]);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [isStep2Submitting, setIsStep2Submitting] = useState(false);

  // State for beneficiaries (Retraite, Epargne Plus, Elikia, Mobateli, Emprunteur)
  const [beneficiaires, setBeneficiaires] = useState<Beneficiary[]>([]);

  // Initialiser le wizard au montage
  useEffect(() => {
    if (mode === "create") {
      resetWizard();
    }
  }, [resetWizard, mode]);

  // Custom resolver that dynamically selects schema based on selected product
  // NOTE: selectedProduct vient du state React (pas du formulaire), car `produit` n'est pas un champ du form
  const dynamicResolver = async (values: any, context: any, options: any) => {
    const productType = selectedProduct || values.produit || "";
    let schema: z.ZodType<any> = BaseProductSchema;
    if (productType) {
      const product = getProduct(productType);
      if (product) schema = product.schema;
    }
    return zodResolver(schema)(values, context, options);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    reset,
    getValues
  } = useForm<SimulationFormData>({
    resolver: dynamicResolver,
    defaultValues: {
      taux_surprime: 0,
      duree_rente: 5,
      periodicite: "M",
      ...wizardData.simulationData
    }
  });

  // Mettre à jour le formulaire quand les données du wizard changent
  useEffect(() => {
    if (wizardData.simulationData && Object.keys(wizardData.simulationData).length > 0) {
      reset({
        taux_surprime: 0,
        duree_rente: 5,
        ...wizardData.simulationData
      });
      if (wizardData.simulationData.produit) {
        setSelectedProduct(wizardData.simulationData.produit);
      }
      if (wizardData.beneficiaires && wizardData.beneficiaires.length > 0) {
        setBeneficiaires(wizardData.beneficiaires.map(ben => ({
          qualite: ben.qualite as "conjoint" | "enfant" | "parent" | "autre" | "organisme_pret" | "assure",
          nom_prenoms: ben.nom_prenoms,
          part_pourcentage: ben.part_pourcentage,
          ordre: ben.ordre,
        })));
      }
    }
  }, [wizardData.simulationData, wizardData.beneficiaires, reset]);

  // Auto-calcul de l'âge RÉEL (au dernier anniversaire) — cohérent avec le backend
  // et conforme à la règle NSIA : l'âge doit correspondre à la date de naissance.
  const dateNaissance = watch("date_naissance");
  useEffect(() => {
    if (dateNaissance) {
      const calculatedAge = calculateRealAge(dateNaissance);
      if (calculatedAge > 0) {
        setValue("age", calculatedAge);
        setValue("age_parent", calculatedAge);
      }
    }
  }, [dateNaissance, setValue]);

  // Auto-fill beneficiary for Emprunteur
  useEffect(() => {
    if (mode === "edit") return;
    if (beneficiaires.length > 0) return;

    if (selectedProduct === "emprunteur" && user?.banque) {
      const bankName = typeof user.banque === 'object' ? (user.banque.nom || user.banque.code || "Banque") : String(user.banque);
      setBeneficiaires([{
        qualite: "organisme_pret",
        nom_prenoms: bankName,
        part_pourcentage: 100,
        ordre: 1
      }]);
    }
  }, [selectedProduct, user?.banque, mode, beneficiaires.length]);

  // Auto-fill numéro de convention depuis les produits_autorises de la banque
  const conventionNumber = useMemo(() => {
    if (!selectedProduct || !user?.banque) return "";
    const banque = user.banque as Banque;
    return banque.conventions?.[selectedProduct] || "";
  }, [selectedProduct, user?.banque]);

  // Quand la convention change, mettre à jour le form
  useEffect(() => {
    if (conventionNumber) {
      setValue("numero_convention" as any, conventionNumber);
    }
  }, [conventionNumber, setValue]);

  // Nettoyer les champs ET charger les valeurs par défaut du domaine
  useEffect(() => {
    if (mode === "edit") return;

    if (selectedProduct) {
      const product = getProduct(selectedProduct);
      if (product) {
        const defaults = product.getDefaultValues();
        const currentValues = getValues();

        reset({
          ...currentValues,
          ...defaults,
          produit: selectedProduct,
          // Injecter la convention si disponible
          ...(conventionNumber ? { numero_convention: conventionNumber } : {}),
          // Préserver l'âge déjà calculé depuis la date de naissance :
          // les valeurs par défaut du produit (age/age_parent) ne doivent PAS
          // écraser l'âge réel calculé à l'étape Client (bug âge incohérent).
          ...(currentValues.age ? { age: currentValues.age } : {}),
          ...(currentValues.age_parent ? { age_parent: currentValues.age_parent } : {}),
        });
      }

      if (selectedProduct !== "emprunteur") {
        setBeneficiaires([]);
      }
    }
  }, [selectedProduct, reset, mode, getValues]);


  // Déterminer les produits disponibles depuis l'API (dynamique)
  let availableProducts = ALL_PRODUITS;

  if (user?.banque) {
    const bankObj = typeof user.banque === 'object' ? user.banque : null;
    if (bankObj?.produits_disponibles?.length) {
      availableProducts = bankObj.produits_disponibles;
    }
  }

  // En mode édition, toujours inclure le produit original de la simulation
  // pour éviter de bloquer l'édition si la banque de l'utilisateur n'a pas ce produit
  if (mode === "edit" && wizardData.simulationData?.produit) {
    const originalProduct = wizardData.simulationData.produit as ProduitType;
    // Only add if it's a valid product with a label
    if (originalProduct && PRODUIT_LABELS[originalProduct] && !availableProducts.includes(originalProduct)) {
      availableProducts = [originalProduct, ...availableProducts];
    }
  }

  // Filter out any invalid products (empty strings, undefined, etc.)
  availableProducts = availableProducts.filter(p => p && PRODUIT_LABELS[p]);

  // Step 1 fields that need validation (only required fields — optional ones validated by Zod)
  const step1Fields = [
    "nom", "prenom", "date_naissance", "telephone", "adresse",
    "profession", "employeur", "numero_compte", "situation_matrimoniale"
  ] as const;

  const onStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate only Step 1 fields
    const isValid = await trigger(step1Fields);
    if (!isValid) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Get current form values
    const data = watch();

    // Sauvegarder les données client et passer à l'étape 2
    updateWizardData({ simulationData: { ...wizardData.simulationData, ...data } });
    setWizardStep(2);
    window.scrollTo(0, 0);
  };

  // Helper: Get only the fields relevant to the selected product
  const getProductSpecificPayload = (product: ProduitType, data: SimulationFormData) => {
    // Common client fields for all products (aligned with BIA forms)
    const commonFields = {
      nom: data.nom,
      prenom: data.prenom,
      titre_assure: (data as any).titre_assure,
      email: data.email,
      date_naissance: data.date_naissance,
      lieu_naissance: (data as any).lieu_naissance,
      nationalite: (data as any).nationalite,
      type_piece_identite: (data as any).type_piece_identite,
      numero_piece_identite: (data as any).numero_piece_identite,
      situation_matrimoniale: data.situation_matrimoniale,
      // Téléphones : cellulaire (principal) + domicile + bureau
      telephone: data.telephone,
      cellulaire: data.telephone,  // L'API attend "cellulaire"
      telephone_domicile: (data as any).telephone_domicile,
      telephone_bureau: (data as any).telephone_bureau,
      // Adresses
      adresse_postale: data.adresse,
      adresse_geographique: (data as any).adresse_geographique,
      // Emploi
      profession: data.profession,
      employeur: data.employeur,
      poste: (data as any).poste,
      adresse_employeur: (data as any).adresse_employeur,
      telephone_employeur: (data as any).telephone_employeur,
      // Compte
      numero_compte: data.numero_compte,
      // Correspondant
      correspondant_nom: (data as any).correspondant_nom,
      correspondant_prenom: (data as any).correspondant_prenom,
      correspondant_adresse: (data as any).correspondant_adresse,
      correspondant_telephone: (data as any).correspondant_telephone,
      correspondant_cellulaire: (data as any).correspondant_cellulaire,
    };

    switch (product) {
      case "emprunteur":
        return {
          ...commonFields,
          // Prêt
          montant_pret: data.montant_pret,
          duree_mois: data.duree_mois,
          duree_differe: (data as any).duree_differe,
          taux_interet: (data as any).taux_interet || data.taux_surprime,
          taux_tps: (data as any).taux_tps,
          type_pret: (data as any).type_pret,
          numero_convention: (data as any).numero_convention,
          qualite_assure: (data as any).qualite_assure,
          // Dates
          date_octroi: (data as any).date_octroi,
          date_effet: (data as any).date_effet,
          date_premiere_echeance: (data as any).date_premiere_echeance,
          // Remboursement
          periodicite_remboursement: (data as any).periodicite_remboursement,
          origine_des_fonds: (data as any).origine_des_fonds,
          // NSIA existant
          deja_souscrit_nsia: (data as any).deja_souscrit_nsia,
          details_contrat_nsia: (data as any).details_contrat_nsia,
          // Bénéficiaires (la banque)
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };
      case "elikia_scolaire":
      case "elikia":
        return {
          ...commonFields,
          // Paramètres Elikia
          rente_annuelle: data.rente_annuelle,
          age_parent: data.age_parent,
          duree_rente: data.duree_rente || 5,
          duree_engagement: data.duree_engagement,
          numero_convention: data.numero_convention,
          // Élèves bénéficiaires
          eleves: (data as any).eleves,
          // Paiement (aligné BIA)
          mode_paiement: data.mode_paiement,
          operateur_mobile_money: (data as any).operateur_mobile_money,
          type_cotisation: (data as any).type_cotisation,
          origine_des_fonds: (data as any).origine_des_fonds,
          // Dates
          date_effet: (data as any).date_effet,
          date_signature: (data as any).date_signature,
          date_fin: (data as any).date_fin,
          date_premiere_prime: (data as any).date_premiere_prime,
          date_echeance: (data as any).date_echeance,
          // Souscripteur
          assure_est_souscripteur: (data as any).assure_est_souscripteur,
          souscripteur_civilite: (data as any).souscripteur_civilite,
          souscripteur_nom: (data as any).souscripteur_nom,
          souscripteur_prenoms: (data as any).souscripteur_prenoms,
          souscripteur_date_naissance: (data as any).souscripteur_date_naissance,
          souscripteur_lieu_naissance: (data as any).souscripteur_lieu_naissance,
          souscripteur_adresse: (data as any).souscripteur_adresse,
          souscripteur_telephone: (data as any).souscripteur_telephone,
          souscripteur_profession: (data as any).souscripteur_profession,
          souscripteur_employeur: (data as any).souscripteur_employeur,
          // Bénéficiaires décès
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };
      case "confort_etudes":
        return {
          ...commonFields,
          // Paramètres études
          age_parent: data.age_parent,
          age_enfant: data.age_enfant,
          montant_rente: data.montant_rente,
          duree_paiement: data.duree_paiement,
          duree_service: data.duree_service,
          // Modalités
          periodicite: data.periodicite,
          mode_paiement: data.mode_paiement,
          origine_des_fonds: (data as any).origine_des_fonds,
          date_effet: (data as any).date_effet,
          date_premiere_cotisation: (data as any).date_premiere_cotisation,
          // Souscripteur
          assure_est_souscripteur: (data as any).assure_est_souscripteur,
          souscripteur_civilite: (data as any).souscripteur_civilite,
          souscripteur_nom: (data as any).souscripteur_nom,
          souscripteur_prenoms: (data as any).souscripteur_prenoms,
          souscripteur_date_naissance: (data as any).souscripteur_date_naissance,
          souscripteur_lieu_naissance: (data as any).souscripteur_lieu_naissance,
          souscripteur_adresse: (data as any).souscripteur_adresse,
          souscripteur_telephone: (data as any).souscripteur_telephone,
          souscripteur_profession: (data as any).souscripteur_profession,
          souscripteur_employeur: (data as any).souscripteur_employeur,
          // NSIA existant
          deja_souscrit_nsia: (data as any).deja_souscrit_nsia,
          details_contrat_nsia: (data as any).details_contrat_nsia,
          // Bénéficiaires
          beneficiaire_terme_assure: (data as any).beneficiaire_terme_assure,
          beneficiaire_deces_conjoint: (data as any).beneficiaire_deces_conjoint,
          beneficiaire_deces_enfants: (data as any).beneficiaire_deces_enfants,
          beneficiaire_deces_autres: (data as any).beneficiaire_deces_autres,
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };
      case "mobateli": {
        const modeCalcMob = (data as any).mode_calcul || 'forfaitaire';

        // Payload complet commun aux deux modes (forfaitaire et sur mesure)
        const fullMobateli = {
          ...commonFields,
          mode_calcul: modeCalcMob,
          // Garanties
          capital_dtc_iad: data.capital_dtc_iad,
          age: data.age,
          option_frais_funeraires: (data as any).option_frais_funeraires,
          // Convention
          numero_convention: (data as any).numero_convention,
          duree_engagement: (data as any).duree_engagement,
          // Famille
          conjoint: (data as any).conjoint,
          enfants: (data as any).enfants,
          // Souscripteur
          assure_est_souscripteur: (data as any).assure_est_souscripteur,
          souscripteur_civilite: (data as any).souscripteur_civilite,
          souscripteur_nom: (data as any).souscripteur_nom,
          souscripteur_prenoms: (data as any).souscripteur_prenoms,
          souscripteur_date_naissance: (data as any).souscripteur_date_naissance,
          souscripteur_lieu_naissance: (data as any).souscripteur_lieu_naissance,
          souscripteur_adresse: (data as any).souscripteur_adresse,
          souscripteur_telephone: (data as any).souscripteur_telephone,
          souscripteur_profession: (data as any).souscripteur_profession,
          souscripteur_employeur: (data as any).souscripteur_employeur,
          // Bénéficiaires prédéfinis
          beneficiaire_deces_conjoint: (data as any).beneficiaire_deces_conjoint,
          beneficiaire_deces_enfants: (data as any).beneficiaire_deces_enfants,
          beneficiaire_deces_autres: (data as any).beneficiaire_deces_autres,
          // Paiement
          mode_paiement: data.mode_paiement,
          type_cotisation: (data as any).type_cotisation,
          origine_des_fonds: (data as any).origine_des_fonds,
          // Dates
          date_premiere_prime: (data as any).date_premiere_prime,
          date_effet: (data as any).date_effet,
          date_echeance: (data as any).date_echeance,
          // Bénéficiaires décès (liste)
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };

        if (modeCalcMob === 'sur_mesure') {
          // Ajouter les champs spécifiques sur mesure au payload complet
          return {
            ...fullMobateli,
            volet: (data as any).volet || 'dtc',
            prime_souhaitee: (data as any).prime_souhaitee,
            duree_sur_mesure: (data as any).duree_sur_mesure,
            type_prime: (data as any).type_prime,
            capital_sur_mesure: (data as any).capital_sur_mesure,
            date_souscription: (data as any).date_souscription,
          };
        }

        return fullMobateli;
      }
      case "confort_retraite":
        return {
          ...commonFields,
          // Cotisation
          prime_periodique_commerciale: data.prime_periodique_commerciale,
          periodicite: data.periodicite,
          mode_paiement: data.mode_paiement,
          origine_des_fonds: (data as any).origine_des_fonds,
          // Garanties
          duree: data.duree,
          capital_deces: data.capital_deces,
          date_premiere_cotisation: (data as any).date_premiere_cotisation,
          // Souscripteur
          assure_est_souscripteur: (data as any).assure_est_souscripteur,
          souscripteur_civilite: (data as any).souscripteur_civilite,
          souscripteur_nom: (data as any).souscripteur_nom,
          souscripteur_prenoms: (data as any).souscripteur_prenoms,
          souscripteur_date_naissance: (data as any).souscripteur_date_naissance,
          souscripteur_lieu_naissance: (data as any).souscripteur_lieu_naissance,
          souscripteur_adresse: (data as any).souscripteur_adresse,
          souscripteur_telephone: (data as any).souscripteur_telephone,
          souscripteur_profession: (data as any).souscripteur_profession,
          souscripteur_employeur: (data as any).souscripteur_employeur,
          // NSIA existant
          deja_souscrit_nsia: (data as any).deja_souscrit_nsia,
          details_contrat_nsia: (data as any).details_contrat_nsia,
          // Bénéficiaires
          beneficiaire_terme_assure: (data as any).beneficiaire_terme_assure,
          beneficiaire_deces_conjoint: (data as any).beneficiaire_deces_conjoint,
          beneficiaire_deces_enfants: (data as any).beneficiaire_deces_enfants,
          beneficiaire_deces_autres: (data as any).beneficiaire_deces_autres,
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };
      case "epargne_plus":
        return {
          ...commonFields,
          cotisation_mensuelle: data.cotisation_mensuelle,
          duree_annees: data.duree_annees || data.duree, // Fallback if user used generic field
          periodicite: data.periodicite,
          numero_compte_cle: data.numero_compte_cle,
          deja_souscrit_nsia: data.deja_souscrit_nsia,
          contrats_nsia_existants: data.contrats_nsia_existants,
          date_effet: (data as any).date_effet,
          date_premiere_cotisation: (data as any).date_premiere_cotisation,
          avec_details: (data as any).avec_details,
          mode_paiement: data.mode_paiement,
          origine_fonds: data.origine_fonds,
          beneficiaires: beneficiaires.length > 0 ? beneficiaires : undefined,
        };
      default:
        return commonFields;
    }
  };

  const onStep2Submit = async (data: SimulationFormData) => {
    console.log("Step 2 Submission Data (Raw):", data);
    console.log("Selected Product:", selectedProduct);
    console.log("Debug Civilité Raw:", (data as any).titre_assure);
    console.log("Debug date_naissance:", JSON.stringify(data.date_naissance), "type:", typeof data.date_naissance);
    console.log("Debug wizardData date_naissance:", JSON.stringify(wizardData.simulationData?.date_naissance));
    console.log("[DEBUG-SM-FORM] mode_calcul from data:", JSON.stringify((data as any).mode_calcul));
    console.log("[DEBUG-SM-FORM] mode_calcul from getValues:", JSON.stringify(getValues("mode_calcul" as any)));
    console.log("[DEBUG-SM-FORM] volet from data:", JSON.stringify((data as any).volet));
    console.log("[DEBUG-SM-FORM] prime_souhaitee from data:", JSON.stringify((data as any).prime_souhaitee));

    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    // Validation spécifique par produit
    let isValid = true;
    let errorMessage = "Veuillez remplir tous les champs obligatoires pour ce produit";



    // Validation des bénéficiaires pour les produits qui les exigent
    // "emprunteur" est exclu car le bénéficiaire est automatiquement la banque
    const productsRequiringBeneficiaires = ["elikia_scolaire", "mobateli", "confort_etudes", "confort_retraite", "epargne_plus"];
    if (productsRequiringBeneficiaires.includes(selectedProduct)) {
      if (beneficiaires.length === 0) {
        isValid = false;
        errorMessage = "Vous devez ajouter au moins un bénéficiaire";
      } else {
        // Pour Retraite, l'assuré ne compte pas dans le calcul des parts (il est bénéficiaire par défaut en cas de vie)
        // On vérifie que les AUTRES bénéficiaires (cas de décès) somment à 100%
        const relevantBeneficiaires = (selectedProduct === "confort_retraite")
          ? beneficiaires.filter(b => b.qualite !== "assure")
          : beneficiaires;

        const totalParts = relevantBeneficiaires.reduce((sum, b) => sum + b.part_pourcentage, 0);

        // Si on a filtré et qu'il ne reste rien (que de l'assuré), le total sera 0 => Erreur "Doit être 100%"
        // C'est le comportement voulu : il faut définir les bénéficiaires décès.

        if (totalParts !== 100) {
          isValid = false;
          errorMessage = `Le total des parts des bénéficiaires${(selectedProduct === "confort_retraite") ? " (hors assuré)" : ""} doit être égal à 100% (actuellement ${totalParts}%)`;
        }
        // Vérifier que tous les bénéficiaires ont un nom
        const beneficiaireSansNom = beneficiaires.find(b => !b.nom_prenoms || b.nom_prenoms.trim() === "");
        if (beneficiaireSansNom) {
          isValid = false;
          errorMessage = "Tous les bénéficiaires doivent avoir un nom";
        }
      }
    }

    if (!isValid) {
      toast.error(errorMessage);
      return;
    }

    setIsStep2Submitting(true);
    try {
      // Build product-specific payload (only relevant fields)
      // Merge with previously saved wizard data to ensure we have client info
      // Le dynamicResolver utilise le schema produit (avec .passthrough()), donc `data` contient tous les champs
      const fullData = { ...wizardData.simulationData, ...data } as SimulationFormData;
      const productPayload = getProductSpecificPayload(selectedProduct, fullData);

      const simulationData = {
        ...fullData,
        ...productPayload,
        produit: selectedProduct
      };
      console.log("Sending Simulation Payload (filtered):", simulationData);

      updateWizardData({ simulationData });

      // En mode édition, on a déjà un ID - pas besoin de créer une nouvelle simulation
      // Cela évite l'erreur "duplicate reference"
      if (wizardData.createdSimulationId) {
        console.log("Edit mode: Skipping createSimulation, using existing ID:", wizardData.createdSimulationId);

        // Conserver les données du formulaire avec l'ID existant
        updateWizardData({
          simulationData: {
            ...simulationData,
            id: wizardData.createdSimulationId,
            reference: wizardData.simulationData?.reference,
            // Garder les résultats de calcul existants si disponibles
            resultats_calcul: wizardData.simulationData?.resultats_calcul
          }
        });

        setWizardStep(3);
        window.scrollTo(0, 0);
        return;
      }

      // Appel API pour simuler (création temporaire ou calcul)
      const result = await createSimulation(selectedProduct, { ...simulationData, sauvegarder: false });

      console.log("API Simulation Result:", result);

      if (result) {
        // Store original form values AND API results separately
        // Do NOT overwrite original form values with API-modified ones
        // The API may modify values (e.g., adding frais to prime_periodique_commerciale)
        // but we need to keep the original user input for subsequent saves
        // NOTE: With sauvegarder: false, no simulation is created in DB, so no ID to store
        updateWizardData({
          // createdSimulationId is NOT set here - simulation will be created in Step 3
          simulationData: {
            ...simulationData,  // Original form values (preserved for save)
            resultats_calcul: result  // API calculated results (for display only)
          }
        });
      }

      setWizardStep(3);
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Erreur simulation:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      toast.error(error?.message || "Erreur lors de la simulation");
    } finally {
      setIsStep2Submitting(false);
    }
  };

  const onStep3Submit = async () => {
    setIsStep2Submitting(true);
    try {
      // Sauvegarder réellement la simulation
      let simulationId = wizardData.createdSimulationId;
      let simulation;

      // Si on a déjà un ID (cas update ou ID temporaire devenu permanent), on update
      // Sinon on crée avec sauvegarder: true
      if (simulationId) {
        // Option A: Update avec statut brouillon confirmé
        await updateSimulation(simulationId, { ...wizardData.simulationData, sauvegarder: true });
        // Récupérer la simulation fraîchement mise à jour via le store (fetchSimulation est appelé par updateSimulation)
        simulation = useSimulationStore.getState().currentSimulation;
        if (!simulation) {
          simulation = { id: simulationId, reference: wizardData.simulationData.reference };
        }
      } else {
        // Option B: Création complète maintenant
        simulation = await createSimulation(
          wizardData.simulationData.produit,
          { ...wizardData.simulationData, sauvegarder: true }
        );
        simulationId = simulation.id;
      }

      if (!simulation || !simulationId) throw new Error("Erreur lors de la sauvegarde");

      updateWizardData({
        createdSimulationId: simulationId,
        simulationData: {
          ...wizardData.simulationData,
          id: simulationId,
          reference: simulation.reference,
          // CRITICAL: Mettre à jour les résultats calculés avec ceux venant du backend
          // (car le calcul Step 2 est sauté en edit, et Step 3 update a recalculé en backend)
          resultats_calcul: simulation.resultats_calcul || wizardData.simulationData?.resultats_calcul,
          donnees_entree: simulation.donnees_entree || wizardData.simulationData?.donnees_entree
        }
      });
      // Toast is handled by the store

      // Skip Medical Questionnaire for Epargne Plus
      if (wizardData.simulationData.produit === 'epargne_plus') {
        // Finish directly logic (replicating onFinalSubmit but safe with local simulationId)
        try {
          // Validate the simulation
          await useSimulationStore.getState().validateSimulation(simulationId);
          toast.success("Simulation validée avec succès");
        } catch (err: any) {
          console.error("Erreur validation auto:", err);
          // Verify if error is just "already validated" or similar, otherwise show toast
          // If validation fails, we might still want to redirect to the draft
        }

        resetWizard();
        router.push(`/simulations/${simulationId}`);
      } else {
        setWizardStep(4);
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);

      // Check for "Already Validated" error to suppress it
      const errorMessage = error?.message || "";
      const responseMessage = error?.response?.data?.message || "";
      const isAlreadyValidated =
        errorMessage.toLowerCase().includes("déjà validée") ||
        errorMessage.toLowerCase().includes("deja valide") ||
        responseMessage.toLowerCase().includes("déjà validée") ||
        responseMessage.toLowerCase().includes("deja valide");

      if (isAlreadyValidated) {
        console.log("Info: Simulation déjà validée, passage à la suite sans erreur bloquante.");

        // Force navigation logic similar to success block
        if (wizardData.simulationData.produit === 'epargne_plus') {
          const simId = wizardData.createdSimulationId || wizardData.simulationData.id;
          resetWizard();
          if (simId) router.push(`/simulations/${simId}`);
        } else {
          setWizardStep(4);
          window.scrollTo(0, 0);
        }
      } else {
        // Standard error handling
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
        toast.error(error?.message || "Erreur lors de la sauvegarde");
      }

    } finally {
      setIsStep2Submitting(false);
    }
  };


  const onStep4Submit = async (data: QuestionnaireMedical) => {
    try {
      // Use createdSimulationId (set in edit mode) or simulationData.id as fallback
      const simulationId = wizardData.createdSimulationId || wizardData.simulationData?.id;
      if (!simulationId) {
        toast.error("Aucune simulation active trouvée");
        return;
      }

      // Vérifier si un questionnaire existe déjà pour cette simulation
      let existingQuestionnaireId = (wizardData.questionnaireData as any)?.id ||
        (wizardData.simulationData as any)?.questionnaire_medical?.id ||
        (wizardData.simulationData as any)?.questionnaire_medical;

      // S'assurer que c'est un nombre
      if (typeof existingQuestionnaireId === 'string') {
        existingQuestionnaireId = parseInt(existingQuestionnaireId, 10);
      }

      const { user } = useAuthStore.getState();
      const payload = {
        ...data,
        createur: user?.id
      };

      console.log("📤 Payload prepared for submission:", {
        ...payload,
        simulation: simulationId // Log implicit simulation ID for debug
      });

      // @ts-ignore
      const details = data.details;
      // @ts-ignore
      delete payload.details;

      let result;


      // TOUJOURS vérifier via l'API quel est le questionnaire associé à CETTE simulation
      // Cela évite de se baser sur des données locales potentiellement obsolètes ou incorrectes
      try {
        // Ne pas passer la référence pour éviter la recherche textuelle - on veut juste l'ID exact lié à la simulation
        const existingList = await questionnairesApi.getQuestionnaires(simulationId);


        if (existingList && existingList.length > 0) {
          // Si l'API renvoie un questionnaire pour cette simulation, c'est CELUI-LA qu'il faut utiliser
          // indépendamment de ce qu'on avait en cache local
          existingQuestionnaireId = existingList[0].id;

          // Update store to keep it in sync
          useSimulationStore.getState().updateWizardData({
            questionnaireData: existingList[0]
          });
        } else {
          console.log("ℹ️ No existing questionnaire found on API for this simulation.");
          // Si l'API dit qu'il n'y en a pas, on remet à null pour forcer la création
          // (Sauf si on avait un ID local qu'on pense correct? Non, l'API est la source de vérité)
          existingQuestionnaireId = null;
        }
      } catch (checkError) {
        console.error("⚠️ Error checking for existing questionnaire:", checkError);
      }

      if (existingQuestionnaireId && !isNaN(existingQuestionnaireId)) {
        // Mise à jour
        console.log("📝 Updating existing questionnaire:", existingQuestionnaireId);
        result = await questionnairesApi.updateQuestionnaire(
          simulationId,
          existingQuestionnaireId,
          payload
        );
        toast.success("Questionnaire mis à jour avec succès");
      } else {
        // Création avec repli si déjà existant
        console.log("✨ Creating new questionnaire");
        try {
          result = await questionnairesApi.createQuestionnaire(simulationId, payload);
          toast.success("Questionnaire enregistré avec succès");
        } catch (createError: any) {
          const errorData = createError?.response?.data;
          const errorString = JSON.stringify(errorData || {});

          if (createError?.response?.status === 400 &&
            (errorString.includes("existe déjà") || errorString.includes("already exists"))) {

            // Repli : tenter de récupérer le questionnaire existant par une recherche
            console.log("Questionnaire déjà existant détecté (400), passage en mode mise à jour...");
            const fallbackSimulationId = simulationId;
            const simulationRef = wizardData.simulationData?.reference;

            const existingList = await questionnairesApi.getQuestionnaires(fallbackSimulationId, simulationRef);
            if (existingList && existingList.length > 0) {
              const existing = existingList[0];
              result = await questionnairesApi.updateQuestionnaire(fallbackSimulationId, existing.id, payload);
              toast.success("Questionnaire mis à jour avec succès");
            } else {
              throw new Error("Le questionnaire existe déjà mais n'a pas pu être récupéré.");
            }
          } else {
            throw createError;
          }
        }
      }

      // Sauvegarde des détails spécifiques (si présents)
      if (details && result?.id) {
        // On ne bloque pas si erreur de détails, on log juste
        try {
          // Récupérer les détails existants pour savoir s'il faut faire un POST ou un PUT
          // Note: result.details peut contenir les objets détails complets
          const existingDetails = (result as any).details || [];
          const existingDetailsMap: Record<string, number> = {};
          if (Array.isArray(existingDetails)) {
            existingDetails.forEach((d: any) => {
              existingDetailsMap[d.question_field] = d.id;
            });
          }

          for (const q of MEDICAL_QUESTIONS) {
            // @ts-ignore
            if (data[q.id] === true) {
              const detail = details[q.id];
              if (detail) {
                const detailPayload = {
                  question_label: q.label,
                  question_field: q.id,
                  precisez: detail.precisez,
                  periode_traitement: detail.periode_traitement,
                  lieu_traitement: detail.lieu_traitement,
                };

                const existingId = existingDetailsMap[q.id];
                if (existingId) {
                  await questionnairesApi.updateQuestionnaireDetail(result.id, existingId, detailPayload);
                } else {
                  await questionnairesApi.addQuestionnaireDetails(result.id, detailPayload);
                }
              }
            }
          }
        } catch (detailError) {
          console.error("Erreur sauvegarde détails médicaux", detailError);
        }
      }

      // Mettre à jour le store avec les nouvelles données
      updateWizardData({
        questionnaireData: result,
        // On met à jour biaInfo avec le résultat qui contient le scoring
        biaInfo: {
          ...wizardData.biaInfo,
          "questionnaire medical": result,
          simulation: wizardData.simulationData
        }
      });

      setWizardStep(5);
    } catch (error: any) {
      console.error("Erreur questionnaire:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement du questionnaire");
    }
  };

  const onFinalSubmit = async () => {
    if (!wizardData.createdSimulationId) return;

    setIsFinalSubmitting(true);
    try {
      // Récupérer le statut actuel de la simulation
      const currentSim = useSimulationStore.getState().currentSimulation;
      const currentStatus = currentSim?.statut;

      // Ne pas appeler la validation si la simulation est déjà validée ou en proposition
      // pour éviter les erreurs de double validation
      if (currentStatus !== "validee" && currentStatus !== "proposition") {
        // Validation finale - toast is handled by the store
        await useSimulationStore.getState().validateSimulation(wizardData.createdSimulationId);
      } else {
        console.log("⏭️ Skipping validation - simulation already in status:", currentStatus);
        toast.success("Simulation mise à jour avec succès");
      }

      resetWizard();
      router.push(`/simulations/${wizardData.createdSimulationId}`);

    } catch (error: any) {
      console.error("Erreur finale:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      toast.error(error?.message || "Une erreur est survenue lors de la validation finale");
    } finally {
      setIsFinalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Stepper */}
      <div className="mb-8 px-2">
        <SimulationStepper
          currentStep={wizardData.step}
          steps={[
            { step: 1, label: "Client", description: "Identité & coordonnées" },
            { step: 2, label: "Produit", description: "Garanties & paramètres" },
            { step: 3, label: "Résultat", description: "Simulation calculée" },
            { step: 4, label: "Santé", description: "Questionnaire médical" },
            { step: 5, label: "BIA", description: "Bulletin d'adhésion" },
          ]}
        />
      </div>

      {/* ÉTAPE 1 : Infos Client */}
      {wizardData.step === 1 && (
        <StepContainer>
        <form onSubmit={onStep1Submit} className="space-y-4">

          <StepCard>
            <StepSectionHeader
              icon={<UserCircle className="w-4 h-4" />}
              title="État Civil"
              subtitle="Informations d'identité de l'assuré"
              accentColor="blue"
            />
            <div className="p-6 space-y-5">
              {/* Civilité + Situation matrimoniale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="titre_assure" className="text-gray-700 font-medium">Civilité</Label>
                  <Select
                    onValueChange={(v) => setValue("titre_assure", v.trim(), { shouldValidate: true })}
                    defaultValue={(watch("titre_assure") || "M").trim()}
                  >
                    <SelectTrigger id="titre_assure" className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Monsieur</SelectItem>
                      <SelectItem value="Mme">Madame</SelectItem>
                      <SelectItem value="Mlle">Mademoiselle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situation_matrimoniale" className="text-gray-700 font-medium">Situation Matrimoniale <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(v) => setValue("situation_matrimoniale", v)}
                    defaultValue={watch("situation_matrimoniale")}
                  >
                    <SelectTrigger id="situation_matrimoniale" className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié(e)</SelectItem>
                      <SelectItem value="divorce">Divorcé(e)</SelectItem>
                      <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.situation_matrimoniale && <p className="text-xs text-red-600 font-medium mt-1">{errors.situation_matrimoniale.message}</p>}
                </div>
              </div>

              {/* Nom + Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-gray-700 font-medium">Nom <span className="text-red-500">*</span></Label>
                  <Input id="nom" autoComplete="family-name" {...register("nom")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="BANANGA" />
                  {errors.nom && <p className="text-xs text-red-600 font-medium mt-1">{errors.nom.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-gray-700 font-medium">Prénom <span className="text-red-500">*</span></Label>
                  <Input id="prenom" autoComplete="given-name" {...register("prenom")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Marc" />
                  {errors.prenom && <p className="text-xs text-red-600 font-medium mt-1">{errors.prenom.message}</p>}
                </div>
              </div>

              {/* Date + Lieu de naissance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date_naissance" className="text-gray-700 font-medium">Date de Naissance <span className="text-red-500">*</span></Label>
                  <DatePickerInput
                    id="date_naissance"
                    value={watch("date_naissance") || undefined}
                    onChange={(value) => setValue("date_naissance", value)}
                    placeholder="JJ/MM/AAAA"
                    error={!!errors.date_naissance}
                  />
                  {errors.date_naissance && <p className="text-xs text-red-600 font-medium mt-1">{errors.date_naissance.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieu_naissance" className="text-gray-700 font-medium">Lieu de Naissance</Label>
                  <Input id="lieu_naissance" {...register("lieu_naissance")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Brazzaville" />
                </div>
              </div>

              {/* Nationalité + Pièce d'identité */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nationalite" className="text-gray-700 font-medium">Nationalité</Label>
                  <Input id="nationalite" {...register("nationalite")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Congolaise" defaultValue="Congolaise" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type_piece_identite" className="text-gray-700 font-medium">Pièce d'identité</Label>
                  <Select
                    onValueChange={(v) => setValue("type_piece_identite", v)}
                    defaultValue={watch("type_piece_identite") || ""}
                  >
                    <SelectTrigger id="type_piece_identite" className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors">
                      <SelectValue placeholder="Type de pièce..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cni">Carte Nationale d'Identité</SelectItem>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="carte_sejour">Carte de Séjour</SelectItem>
                      <SelectItem value="permis_conduire">Permis de Conduire</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_piece_identite" className="text-gray-700 font-medium">N° Pièce</Label>
                  <Input id="numero_piece_identite" {...register("numero_piece_identite")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors font-mono" placeholder="AB1234567" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email <span className="text-gray-400 text-xs font-normal">(Optionnel)</span></Label>
                <div className="relative">
                  <Input id="email" type="email" autoComplete="email" {...register("email")} className="h-11 pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="jean.dupont@example.com" />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {errors.email && <p className="text-xs text-red-600 font-medium mt-1">{errors.email.message}</p>}
              </div>
            </div>
          </StepCard>

          {/* ── SECTION 2 : Coordonnées ───────────────────────── */}
          <StepCard>
            <StepSectionHeader
              icon={<Phone className="w-4 h-4" />}
              title="Coordonnées"
              subtitle="Téléphones et adresses de l'assuré"
              accentColor="emerald"
            />
            <div className="p-6 space-y-5">
              {/* 3 téléphones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-gray-700 font-medium">Cellulaire <span className="text-red-500">*</span></Label>
                  <Input id="telephone" autoComplete="tel" {...register("telephone")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="06XXXXXXX" />
                  {errors.telephone && <p className="text-xs text-red-600 font-medium mt-1">{errors.telephone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone_domicile" className="text-gray-700 font-medium">Tél. Domicile</Label>
                  <Input id="telephone_domicile" {...register("telephone_domicile")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="01XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone_bureau" className="text-gray-700 font-medium">Tél. Bureau</Label>
                  <Input id="telephone_bureau" {...register("telephone_bureau")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="06XXXXXXX" />
                </div>
              </div>

              {/* 2 adresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="adresse" className="text-gray-700 font-medium">Adresse Postale <span className="text-red-500">*</span></Label>
                  <Input id="adresse" autoComplete="street-address" {...register("adresse")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="BP 1234, Brazzaville" />
                  {errors.adresse && <p className="text-xs text-red-600 font-medium mt-1">{errors.adresse.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse_geographique" className="text-gray-700 font-medium">Adresse Géographique <span className="text-gray-400 text-xs font-normal">(Quartier, Commune)</span></Label>
                  <Input id="adresse_geographique" {...register("adresse_geographique")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Bacongo, Arr. 2, Brazzaville" />
                </div>
              </div>
            </div>
          </StepCard>

          {/* ── SECTION 3 : Emploi & Compte ───────────────────── */}
          <StepCard>
            <StepSectionHeader
              icon={<Briefcase className="w-4 h-4" />}
              title="Activité Professionnelle"
              subtitle="Emploi, employeur et compte bancaire"
              accentColor="amber"
            />
            <div className="p-6 space-y-5">
              {/* Profession + Poste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-gray-700 font-medium">Profession <span className="text-red-500">*</span></Label>
                  <Input id="profession" autoComplete="organization-title" {...register("profession")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Ingénieur informatique" />
                  {errors.profession && <p className="text-xs text-red-600 font-medium mt-1">{errors.profession.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poste" className="text-gray-700 font-medium">Poste Occupé</Label>
                  <Input id="poste" {...register("poste")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Chef de service" />
                </div>
              </div>

              {/* Employeur + Adresse employeur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employeur" className="text-gray-700 font-medium">Employeur <span className="text-red-500">*</span></Label>
                  <Input id="employeur" autoComplete="organization" {...register("employeur")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="NSIA Assurances" />
                  {errors.employeur && <p className="text-xs text-red-600 font-medium mt-1">{errors.employeur.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse_employeur" className="text-gray-700 font-medium">Adresse Employeur</Label>
                  <Input id="adresse_employeur" {...register("adresse_employeur")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Avenue de la Paix, Brazzaville" />
                </div>
              </div>

              {/* Tél employeur + Numéro de compte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telephone_employeur" className="text-gray-700 font-medium">Tél. Employeur</Label>
                  <Input id="telephone_employeur" {...register("telephone_employeur")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="06XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_compte" className="text-gray-700 font-medium">Numéro de Compte Bancaire <span className="text-red-500">*</span></Label>
                  <Input id="numero_compte" {...register("numero_compte")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors font-mono" placeholder="XXXX XXXX XXXX XXXX XX" />
                  {errors.numero_compte && <p className="text-xs text-red-600 font-medium mt-1">{errors.numero_compte.message}</p>}
                </div>
              </div>
            </div>
          </StepCard>

          {/* ── SECTION 4 : Correspondant ─────────────────────── */}
          <StepCard>
            <StepSectionHeader
              icon={<Users className="w-4 h-4" />}
              title="Correspondant"
              subtitle="Personne à contacter en cas d'indisponibilité (optionnel)"
              accentColor="violet"
            />
            <div className="p-6 space-y-5">
              {/* Nom + Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="correspondant_nom" className="text-gray-700 font-medium">Nom</Label>
                  <Input id="correspondant_nom" {...register("correspondant_nom")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Nom du correspondant" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correspondant_prenom" className="text-gray-700 font-medium">Prénom</Label>
                  <Input id="correspondant_prenom" {...register("correspondant_prenom")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Prénom du correspondant" />
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label htmlFor="correspondant_adresse" className="text-gray-700 font-medium">Adresse</Label>
                <Input id="correspondant_adresse" {...register("correspondant_adresse")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="Adresse du correspondant" />
              </div>

              {/* Téléphones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="correspondant_telephone" className="text-gray-700 font-medium">Téléphone</Label>
                  <Input id="correspondant_telephone" {...register("correspondant_telephone")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="01XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correspondant_cellulaire" className="text-gray-700 font-medium">Cellulaire</Label>
                  <Input id="correspondant_cellulaire" {...register("correspondant_cellulaire")} className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors" placeholder="06XXXXXXX" />
                </div>
              </div>
            </div>
          </StepCard>

          <StepNavigation
            type="submit"
            onNextLabel="Continuer"
            showBack={false}
          />
        </form>
        </StepContainer>
      )}

      {/* ÉTAPE 2 : Produit */}
      {wizardData.step === 2 && (
        <StepContainer>
        <form
          onSubmit={handleSubmit(onStep2Submit, (errors) => {
            console.error("Form validation errors:", errors);
            toast.error(`Erreur de validation: ${Object.keys(errors).map(k => k.replace(/_/g, ' ')).join(", ")}`);
          })}
          className="space-y-4"
        >
          <StepCard>
            <StepSectionHeader
              icon={<Shield className="w-4 h-4" />}
              title="Sélection du Produit"
              subtitle="Choisissez le produit d'assurance à simuler"
              accentColor="blue"
            />
            <div className="p-6">
              {availableProducts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500 font-medium">Aucun produit disponible pour cette configuration.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableProducts.map((product) => {
                    const isSelected = selectedProduct === product;
                    const icon = getProductIcon(product);
                    return (
                      <button
                        key={product}
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className={`
                                    relative p-5 rounded-xl text-left transition-all duration-300 group
                                    ${isSelected
                            ? "bg-blue-50 border-2 border-blue-500 shadow-md transform scale-[1.02]"
                            : "bg-white border border-gray-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm"}
                                `}
                      >
                        <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors
                                    ${isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"}
                                `}>
                          {icon}
                        </div>
                        <h3 className={`font-bold text-base mb-1 ${isSelected ? "text-blue-800" : "text-gray-800"}`}>
                          {getLabel(product)}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          Simulez votre contrat {getLabel(product)} dès maintenant.
                        </p>
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-blue-500 animate-in fade-in zoom-in">
                            <CheckCircle className="w-5 h-5 fill-current" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </StepCard>

          {selectedProduct && (
            <StepCard>
              <StepSectionHeader
                icon={<FileText className="w-4 h-4" />}
                title={`Paramètres — ${getLabel(selectedProduct)}`}
                subtitle="Renseignez les détails du contrat et les bénéficiaires"
                accentColor="violet"
              />
              <div className="p-6 space-y-4">
                {/* Emprunteur ADI - Refactored */}
                {selectedProduct === "emprunteur" && (
                  <EmprunteurSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Elikia Scolaire - Refactored */}
                {selectedProduct === "elikia_scolaire" && (
                  <ElikiaSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Mobateli */}
                {(selectedProduct === "mobateli") && (
                  <MobateliSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Confort Etudes - Refactored */}
                {selectedProduct === "confort_etudes" && (
                  <ConfortEtudesSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Confort Retraite (Seulement) */}
                {(selectedProduct === "confort_retraite") && (
                  <ConfortRetraiteSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Epargne Plus - Refactored */}
                {selectedProduct === "epargne_plus" && (
                  <EpargnePlusSection
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                  />
                )}

                {/* Section Bénéficiaires - Refactored */}
                {beneficiaryConfig && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <BeneficiarySection
                      config={beneficiaryConfig}
                      beneficiaries={beneficiaires}
                      onUpdate={setBeneficiaires}
                    />
                  </div>
                )}
              </div>
            </StepCard>
          )}

          <StepNavigation
            type="submit"
            onBack={() => setWizardStep(1)}
            onNextLabel={isStep2Submitting ? "Simulation en cours..." : "Simuler"}
            isLoading={isStep2Submitting}
            showBack={true}
          />
        </form>
        </StepContainer>
      )}

      {/* ÉTAPE 3 : Résultat (Review) */}
      {wizardData.step === 3 && (
        <StepContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Résultat de la Simulation</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {(() => {
                // Get original user input values (these should NOT be overwritten by API results)
                const originalInput = wizardData.simulationData || {};
                // Get calculated results from API
                const calculatedResults = wizardData.simulationData?.resultats_calcul || {};

                // Merge: start with calculated results, then override with original input for user-provided fields
                // This ensures:
                // - prime_periodique_commerciale shows user's input (100,000), not API-modified (101,000)
                // - prime_totale, capital_garanti, etc. show API calculated values
                const displayData = {
                  ...calculatedResults,  // API calculated values (prime_totale, capital_garanti, frais_accessoires, etc.)
                  ...originalInput,       // Original form values (preserves user input)
                  // Explicitly get calculated values that should come from API results
                  prime_totale: calculatedResults.prime_totale || originalInput.prime_totale,
                  capital_garanti: calculatedResults.capital_garanti || originalInput.capital_garanti,
                  prime_epargne: calculatedResults.prime_epargne,
                  prime_deces: calculatedResults.prime_deces,
                  prime_nette: calculatedResults.prime_nette,
                  frais_accessoires: calculatedResults.frais_accessoires,
                  net_a_debourser: calculatedResults.net_a_debourser,
                  prime_mensuelle: calculatedResults.prime_mensuelle,
                  prime_annuelle: calculatedResults.prime_annuelle,
                  prime_unique: calculatedResults.prime_unique,

                  // Fix: Prioritize Input value, fallback to API result if input is missing/undefined
                  // This prevents 'undefined' from form inputs overwriting valid API calculated dates
                  // IMPORTANT : Couvre TOUTES les dates de TOUS les produits (Emprunteur, Mobateli, Elikia,
                  // Confort Etudes, Confort Retraite, Epargne Plus) afin d'éviter qu'une date saisie par
                  // l'utilisateur reste invisible dans le récap alors qu'elle apparaît dans le détail/BIA.
                  date_signature: originalInput.date_signature || calculatedResults.date_signature,
                  date_premiere_cotisation: originalInput.date_premiere_cotisation || calculatedResults.date_premiere_cotisation,
                  date_fin: originalInput.date_fin || calculatedResults.date_fin,
                  date_effet: originalInput.date_effet || calculatedResults.date_effet,
                  date_octroi: originalInput.date_octroi || calculatedResults.date_octroi,
                  date_premiere_echeance: originalInput.date_premiere_echeance || calculatedResults.date_premiere_echeance,
                  date_premiere_prime: originalInput.date_premiere_prime || calculatedResults.date_premiere_prime,
                  date_echeance: originalInput.date_echeance || calculatedResults.date_echeance,
                  date_souscription: originalInput.date_souscription || calculatedResults.date_souscription,
                  date_naissance: originalInput.date_naissance || calculatedResults.date_naissance,
                  duree_engagement: originalInput.duree_engagement || calculatedResults.duree_engagement,
                  duree_paiement: originalInput.duree_paiement || calculatedResults.duree_paiement,
                  duree_rente: originalInput.duree_rente || calculatedResults.duree_rente,
                };

                const productName = getLabel((selectedProduct || displayData.produit) as ProduitType) ||
                  (displayData.produit && getLabel(displayData.produit.toLowerCase())) ||
                  displayData.produit ||
                  "-";
                const clientName = `${displayData.prenom || watch("prenom")} ${displayData.nom || watch("nom")}`;

                return (
                  <>
                    {/* Informations Client Détaillées */}
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          Informations Client
                        </h3>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Nom complet</span>
                            <span className="font-medium text-gray-900">{clientName}</span>
                          </div>
                          {displayData.email && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Email</span>
                              <span className="font-medium text-gray-900">{displayData.email}</span>
                            </div>
                          )}
                          {displayData.telephone && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Téléphone</span>
                              <span className="font-medium text-gray-900">{displayData.telephone}</span>
                            </div>
                          )}
                          {displayData.date_naissance && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Date de naissance</span>
                              <span className="font-medium text-gray-900">{formatDateFull(displayData.date_naissance)}</span>
                            </div>
                          )}
                          {displayData.lieu_naissance && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Lieu de naissance</span>
                              <span className="font-medium text-gray-900">{displayData.lieu_naissance}</span>
                            </div>
                          )}
                          {displayData.adresse && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded col-span-1 md:col-span-2">
                              <span className="text-gray-600">Adresse</span>
                              <span className="font-medium text-gray-900">{displayData.adresse}</span>
                            </div>
                          )}
                          {displayData.profession && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Profession</span>
                              <span className="font-medium text-gray-900">{displayData.profession}</span>
                            </div>
                          )}
                          {displayData.employeur && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Employeur</span>
                              <span className="font-medium text-gray-900">{displayData.employeur}</span>
                            </div>
                          )}
                          {displayData.numero_compte && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">N° Compte</span>
                              <span className="font-medium text-gray-900 font-mono">{displayData.numero_compte}</span>
                            </div>
                          )}
                          {displayData.situation_matrimoniale && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Situation matrimoniale</span>
                              <span className="font-medium text-gray-900 capitalize">{displayData.situation_matrimoniale}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge Produit */}
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <Briefcase className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Produit sélectionné</p>
                          <p className="text-base font-semibold text-gray-900">{productName}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Simulation
                      </span>
                    </div>

                    {/* Recap des données saisies - Emprunteur */}
                    {wizardData.simulationData && selectedProduct === "emprunteur" && (
                      <div className="space-y-4">
                        {/* Bloc 1: Résultats de la Simulation (API Response) - PRIORITAIRE */}
                        {calculatedResults && Object.keys(calculatedResults).length > 0 && (
                          <div className="border rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-500" />
                                Résultats de la Simulation
                              </h3>
                            </div>
                            <div className="p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {/* Âge emprunteur */}
                                {calculatedResults.age_emprunteur !== undefined && (
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Âge emprunteur</span>
                                    <span className="font-medium text-gray-900">{calculatedResults.age_emprunteur} ans</span>
                                  </div>
                                )}

                                {/* Durée en années */}
                                {calculatedResults.duree_annees !== undefined && (
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Durée</span>
                                    <span className="font-medium text-gray-900">{calculatedResults.duree_annees} an(s)</span>
                                  </div>
                                )}

                                {/* Date de terme */}
                                {calculatedResults.date_terme && (
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date de terme</span>
                                    <span className="font-medium text-gray-900">{formatDateFull(calculatedResults.date_terme)}</span>
                                  </div>
                                )}


                                {/* Tranche d'âge */}
                                {calculatedResults.tranche_age_utilisee && (
                                  <div className="flex justify-between p-2 bg-gray-50 rounded col-span-1 md:col-span-2">
                                    <span className="text-gray-600">Tranche d'âge utilisée</span>
                                    <span className="font-medium text-gray-900">{calculatedResults.tranche_age_utilisee}</span>
                                  </div>
                                )}

                                {/* Prime nette */}
                                {calculatedResults.prime_nette !== undefined && (
                                  <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                    <span className="text-blue-700 font-semibold">Prime nette</span>
                                    <span className="font-bold text-blue-700">{formatCFA(calculatedResults.prime_nette)} FCFA</span>
                                  </div>
                                )}

                                {/* Frais accessoires */}
                                {calculatedResults.frais_accessoires !== undefined && (
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Frais accessoires</span>
                                    <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                  </div>
                                )}

                                {/* Surprime */}
                                {calculatedResults.surprime !== undefined && Number(calculatedResults.surprime) > 0 && (
                                  <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                    <span className="text-orange-700 font-semibold">Surprime</span>
                                    <span className="font-bold text-orange-700">{formatCFA(calculatedResults.surprime)} FCFA</span>
                                  </div>
                                )}

                                {/* Prime totale */}
                                {calculatedResults.prime_totale !== undefined && (
                                  <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                    <span className="text-green-800 font-bold text-base">Prime totale</span>
                                    <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                  </div>
                                )}


                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bloc 2: Informations du Prêt */}
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              Informations du Prêt
                            </h3>
                          </div>
                          <div className="p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {displayData.numero_convention && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">N° Convention</span>
                                  <span className="font-medium text-gray-900">{displayData.numero_convention}</span>
                                </div>
                              )}
                              {displayData.type_pret && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Type de Prêt</span>
                                  <span className="font-medium text-gray-900">{displayData.type_pret}</span>
                                </div>
                              )}
                              {displayData.montant_pret !== undefined && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Montant du Prêt</span>
                                  <span className="font-bold text-blue-700">{Number(displayData.montant_pret).toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}
                              {displayData.duree_mois !== undefined && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Durée</span>
                                  <span className="font-medium text-gray-900">{displayData.duree_mois} mois</span>
                                </div>
                              )}
                              {(displayData.taux_interet !== undefined || displayData.taux_surprime !== undefined) && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Taux du prêt</span>
                                  <span className="font-medium text-gray-900">{Number(displayData.taux_interet || displayData.taux_surprime || 0).toFixed(2)} %</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bloc 2: Dates Importantes */}
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                            <h3 className="font-semibold text-green-800 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-green-500" />
                              Dates Importantes
                            </h3>
                          </div>
                          <div className="p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {displayData.date_octroi && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Date d'Octroi</span>
                                  <span className="font-medium text-gray-900">{formatDateFull(displayData.date_octroi)}</span>
                                </div>
                              )}
                              {displayData.date_effet && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Date d'Effet</span>
                                  <span className="font-medium text-gray-900">{formatDateFull(displayData.date_effet)}</span>
                                </div>
                              )}
                              {displayData.date_premiere_echeance && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">1ère Échéance</span>
                                  <span className="font-medium text-gray-900">{formatDateFull(displayData.date_premiere_echeance)}</span>
                                </div>
                              )}
                              {!displayData.date_octroi && !displayData.date_effet && !displayData.date_premiere_echeance && (
                                <div className="col-span-3 text-center text-gray-400 py-2">
                                  Aucune date renseignée
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bloc 3: Modalités de Paiement */}
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                            <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-purple-500" />
                              Modalités de Paiement
                            </h3>
                          </div>
                          <div className="p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {displayData.periodicite && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Périodicité</span>
                                  <span className="font-medium text-gray-900 capitalize">{displayData.periodicite}</span>
                                </div>
                              )}
                              {displayData.mode_paiement && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Mode Paiement</span>
                                  <span className="font-medium text-gray-900 capitalize">{displayData.mode_paiement.replace(/_/g, ' ')}</span>
                                </div>
                              )}
                              {displayData.origine_fonds && (
                                <div className="flex justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">Origine Fonds</span>
                                  <span className="font-medium text-gray-900 capitalize">{displayData.origine_fonds.replace(/_/g, ' ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recap pour les autres produits (non-Emprunteur) */}
                    {wizardData.simulationData && selectedProduct !== "emprunteur" && (
                      <div className="space-y-4">
                        {/* Bloc Résultats de la Simulation pour Etudes / Elikia / etc. si dispos */}
                        {calculatedResults && Object.keys(calculatedResults).length > 0 && (
                          <div className="border rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-500" />
                                Résultats de la Simulation
                              </h3>
                            </div>
                            <div className="p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {selectedProduct === "confort_etudes" ? (
                                  <>
                                    {calculatedResults.prime_unique !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Unique</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_unique)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_annuelle !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Annuelle</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_annuelle)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_mensuelle !== undefined && (
                                      <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                        <span className="text-blue-700 font-semibold">Prime Mensuelle</span>
                                        <span className="font-bold text-blue-700">{formatCFA(calculatedResults.prime_mensuelle)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.montant_rente_annuel !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Rente Annuelle</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.montant_rente_annuel)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.frais_accessoires !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Frais Accessoires</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.cotisation_totale !== undefined && (
                                      <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                        <span className="text-green-800 font-bold text-base">Cotisation Totale</span>
                                        <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.cotisation_totale)} FCFA</span>
                                      </div>
                                    )}
                                  </>
                                ) : (selectedProduct === "confort_retraite" || selectedProduct === "epargne_plus") ? (
                                  <>
                                    {selectedProduct === "epargne_plus" && (
                                      <div className="col-span-1 md:col-span-2 space-y-3 mb-6">
                                        <h4 className="font-semibold text-emerald-800 border-b border-emerald-100 pb-1 mb-2">Résultats Financiers Epargne Plus</h4>

                                        {calculatedResults.capital_acquis !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Capital Acquis</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.capital_acquis)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.cumul_cotisations !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Cumul Cotisations</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.cumul_cotisations)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.interets_totaux !== undefined && (
                                          <div className="flex justify-between p-2 bg-emerald-50 rounded border border-emerald-100">
                                            <span className="text-emerald-700 font-semibold">Intérêts Totaux</span>
                                            <span className="font-bold text-emerald-700">{formatCFA(calculatedResults.interets_totaux)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.frais_adhesion !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Frais d'Adhésion</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_adhesion)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.capital_apres_penalite !== undefined && (
                                          <div className="flex justify-between p-3 bg-emerald-100 rounded border-2 border-emerald-300 shadow-sm mt-4">
                                            <span className="text-emerald-900 font-bold text-base">Capital Net (après pénalité)</span>
                                            <span className="font-bold text-emerald-900 text-base">{formatCFA(calculatedResults.capital_apres_penalite)} FCFA</span>
                                          </div>
                                        )}

                                        {/* Evolution Mensuelle Table (Epargne Plus) */}
                                        {selectedProduct === 'epargne_plus' && (
                                          <>
                                            {calculatedResults.evolution_mensuelle && Array.isArray(calculatedResults.evolution_mensuelle) && calculatedResults.evolution_mensuelle.length > 0 ? (
                                              <div className="mt-6">
                                                <h4 className="font-semibold text-emerald-800 border-b border-emerald-100 pb-1 mb-4 flex items-center justify-between">
                                                  <span>Evolution Mensuelle de l'Epargne</span>
                                                  <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                                    {calculatedResults.evolution_mensuelle.length} mois
                                                  </span>
                                                </h4>
                                                {/* Table Content */}

                                                <div className="overflow-x-auto border rounded-lg shadow-sm max-h-96">
                                                  <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                                      <tr>
                                                        <th scope="col" className="px-3 py-3 w-16 text-center">Mois</th>
                                                        <th scope="col" className="px-3 py-3 text-right">Prime Brute</th>
                                                        <th scope="col" className="px-3 py-3 text-right">Cumul Primes</th>
                                                        <th scope="col" className="px-3 py-3 text-right">Mnt Investi</th>
                                                        <th scope="col" className="px-3 py-3 text-right">Intérêts</th>
                                                        <th scope="col" className="px-3 py-3 text-right font-bold text-emerald-700">Capital Fin</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                      {calculatedResults.evolution_mensuelle.map((row: any) => (
                                                        <tr key={row.mois} className="hover:bg-gray-50 transition-colors">
                                                          <td className="px-3 py-2 text-center font-medium text-gray-900 border-r">{row.mois}</td>
                                                          <td className="px-3 py-2 text-right text-gray-600">{formatCFA(row.prime_brute)}</td>
                                                          <td className="px-3 py-2 text-right text-gray-500 text-xs">{formatCFA(row.cumul_primes)}</td>
                                                          <td className="px-3 py-2 text-right text-gray-600">{formatCFA(row.prime_nette)}</td>
                                                          <td className="px-3 py-2 text-right text-emerald-600">+{formatCFA(row.interet_cumul)}</td>
                                                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCFA(row.capital_fin)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                    <tfoot className="bg-emerald-50 text-emerald-900 font-semibold sticky bottom-0 z-10">
                                                      <tr>
                                                        <td colSpan={6} className="px-3 py-2 text-center text-xs">
                                                          * Tableau d'amortissement indicatif
                                                        </td>
                                                      </tr>
                                                    </tfoot>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : (watch("avec_details") && (
                                              <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                                                <p className="font-medium">Aucune donnée mensuelle disponible.</p>
                                                <p className="text-sm mt-1">Vérifiez que l'option "Voir le détail mensuel" est bien prise en compte par le serveur.</p>
                                              </div>
                                            ))}
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {calculatedResults.capital_garanti !== undefined && (
                                      <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100">
                                        <span className="text-purple-700 font-semibold">Capital Garanti Terme</span>
                                        <span className="font-bold text-purple-700">{formatCFA(calculatedResults.capital_garanti)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.nombre_periodes !== undefined && (
                                      <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100">
                                        <span className="text-purple-700 font-semibold">Nombre de Périodes</span>
                                        <span className="font-bold text-purple-700">{calculatedResults.nombre_periodes}</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_epargne !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Épargne</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_epargne)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_deces !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Décès</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_deces)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_nette !== undefined && (
                                      <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                        <span className="text-blue-700 font-semibold">Prime Nette</span>
                                        <span className="font-bold text-blue-700">{formatCFA(calculatedResults.prime_nette)} FCFA</span>
                                      </div>
                                    )}
                                    {wizardData.simulationData?.prime_periodique_commerciale !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Périodique</span>
                                        <span className="font-medium text-gray-900">{formatCFA(wizardData.simulationData.prime_periodique_commerciale)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.frais_accessoires !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Frais Accessoires</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_periodique_commerciale !== undefined && (
                                      <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                        <span className="text-blue-700 font-semibold">Prime Périodique Commerciale</span>
                                        <span className="font-bold text-blue-700">{formatCFA(calculatedResults.prime_periodique_commerciale)} FCFA</span>
                                      </div>
                                    )}
                                    {calculatedResults.prime_totale !== undefined && (
                                      <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                        <span className="text-green-800 font-bold text-base">Prime Totale</span>
                                        <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                      </div>
                                    )}
                                  </>
                                ) : selectedProduct === "elikia_scolaire" ? (
                                  /* Elikia - Résultats Financiers Spécifiques (Directement dans la grille parente) */
                                  <>
                                    {/* Prime Annuelle */}
                                    {calculatedResults.prime_nette_annuelle !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Nette Annuelle</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_nette_annuelle)} FCFA</span>
                                      </div>
                                    )}
                                    {/* Prime Mensuelle */}
                                    {calculatedResults.prime_mensuelle !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Prime Mensuelle</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_mensuelle)} FCFA</span>
                                      </div>
                                    )}
                                    {/* Capital Garanti */}
                                    {(calculatedResults.capital_garanti !== undefined || displayData.capital_garanti !== undefined) && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Capital Garanti</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.capital_garanti || displayData.capital_garanti || 0)} FCFA</span>
                                      </div>
                                    )}
                                    {/* Rente Annuelle */}
                                    {(calculatedResults.rente_annuelle !== undefined || displayData.rente_annuelle !== undefined) && (
                                      <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                        <span className="text-blue-700 font-semibold">Rente Annuelle</span>
                                        <span className="font-bold text-blue-700">{formatCFA(calculatedResults.rente_annuelle || displayData.rente_annuelle || 0)} FCFA</span>
                                      </div>
                                    )}
                                    {/* Frais Accessoires */}
                                    {calculatedResults.frais_accessoires !== undefined && (
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Frais Accessoires</span>
                                        <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                      </div>
                                    )}
                                    {/* Prime Totale */}
                                    {calculatedResults.prime_totale !== undefined && (
                                      <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                        <span className="text-green-800 font-bold text-base">Prime Totale</span>
                                        <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                      </div>
                                    )}
                                  </>
                                ) : selectedProduct === "mobateli" ? (
                                  /* Mobateli - Résultats Financiers (Forfaitaire + Sur Mesure) */
                                  <>
                                    {/* Badge mode de calcul */}
                                    <div className={`flex justify-between p-2 rounded border col-span-1 md:col-span-2 ${calculatedResults.volet ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                                      <span className={`font-semibold ${calculatedResults.volet ? 'text-indigo-700' : 'text-orange-700'}`}>Mode</span>
                                      <span className={`font-bold ${calculatedResults.volet ? 'text-indigo-700' : 'text-orange-700'}`}>
                                        {calculatedResults.volet
                                          ? `Sur Mesure — ${calculatedResults.volet_label || (calculatedResults.volet === 'dtc' ? 'DTC (Prime → Capital)' : 'DTC+FF (Capital → Prime)')}`
                                          : 'Tarifaire'}
                                      </span>
                                    </div>

                                    {/* ===== TARIFAIRE (forfaitaire) ===== */}
                                    {!calculatedResults.volet && (
                                      <>
                                        {calculatedResults.tranche_age !== undefined && (
                                          <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                            <span className="text-blue-700 font-semibold">Tranche d'âge</span>
                                            <span className="font-bold text-blue-700">{calculatedResults.tranche_age}</span>
                                          </div>
                                        )}
                                        {calculatedResults.age !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Âge</span>
                                            <span className="font-medium text-gray-900">{calculatedResults.age} ans</span>
                                          </div>
                                        )}
                                        {calculatedResults.capital_dtc_iad !== undefined && (
                                          <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                            <span className="text-orange-700 font-semibold">Capital DTC/IAD</span>
                                            <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc_iad)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime_nette !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Prime Nette</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_nette)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime_mensuelle !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Prime Mensuelle</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime_mensuelle)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.frais_accessoires !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Frais Accessoires</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime_totale !== undefined && (
                                          <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                            <span className="text-green-800 font-bold text-base">Prime Totale</span>
                                            <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* ===== SUR MESURE DTC (prime → capital) ===== */}
                                    {calculatedResults.volet === 'dtc' && (
                                      <>
                                        {calculatedResults.age !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Âge</span>
                                            <span className="font-medium text-gray-900">{calculatedResults.age} ans</span>
                                          </div>
                                        )}
                                        {calculatedResults.capital_dtc_iad !== undefined && (
                                          <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                            <span className="text-orange-700 font-semibold">Capital DTC/IAD (calculé)</span>
                                            <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc_iad)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.duree !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Durée</span>
                                            <span className="font-medium text-gray-900">{calculatedResults.duree} an(s)</span>
                                          </div>
                                        )}
                                        {calculatedResults.type_prime_label && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Type de Prime</span>
                                            <span className="font-medium text-gray-900">{calculatedResults.type_prime_label}</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Prime Saisie</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.frais_accessoires !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Frais Accessoires</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime_totale !== undefined && (
                                          <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                            <span className="text-green-800 font-bold text-base">Prime Totale</span>
                                            <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* ===== SUR MESURE DTC+FF (capital → prime) ===== */}
                                    {calculatedResults.volet === 'dtc_ff' && (
                                      <>
                                        {calculatedResults.age !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Âge</span>
                                            <span className="font-medium text-gray-900">{calculatedResults.age} ans</span>
                                          </div>
                                        )}
                                        {calculatedResults.capital_dtc !== undefined && (
                                          <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                            <span className="text-orange-700 font-semibold">Capital DTC</span>
                                            <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.frais_funeraires && (
                                          <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100">
                                            <span className="text-purple-700 font-semibold">Frais Funéraires</span>
                                            <span className="font-bold text-purple-700">{formatCFA(calculatedResults.frais_funeraires.total)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.capital_total !== undefined && (
                                          <div className="flex justify-between p-2 bg-amber-50 rounded border border-amber-200">
                                            <span className="text-amber-800 font-semibold">Capital Total (DTC + FF)</span>
                                            <span className="font-bold text-amber-800">{formatCFA(calculatedResults.capital_total)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Prime Calculée</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.prime)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.frais_accessoires !== undefined && (
                                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-gray-600">Frais Accessoires</span>
                                            <span className="font-medium text-gray-900">{formatCFA(calculatedResults.frais_accessoires)} FCFA</span>
                                          </div>
                                        )}
                                        {calculatedResults.prime_totale !== undefined && (
                                          <div className="flex justify-between p-3 bg-green-50 rounded border-2 border-green-200 col-span-1 md:col-span-2">
                                            <span className="text-green-800 font-bold text-base">Prime Totale</span>
                                            <span className="font-bold text-green-800 text-base">{formatCFA(calculatedResults.prime_totale)} FCFA</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  /* Autres produits (Confort Retraite, etc.) */
                                  Object.entries(calculatedResults).map(([key, val]) => {
                                    // Filtrer les clés déjà affichées ailleurs pour Elikia/Mobateli
                                    const excludedKeys = [
                                      'age', 'age_parent', 'age_enfant',
                                      'duree_rente', 'duree_paiement', 'duree_engagement', 'duree_service',
                                      'rente_annuelle', 'montant_rente',
                                      'prime_periodique_commerciale', 'prime_unique', 'capital_garanti',
                                      'date_signature', 'date_fin', 'date_premiere_cotisation', 'date_effet', 'dates_renouvellement',
                                      'prime_nette_annuelle', 'prime_mensuelle', 'tranche_age', 'frais_accessoires', 'prime_totale'
                                    ];

                                    if (typeof val === 'number' && !excludedKeys.includes(key)) {
                                      return (
                                        <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                          <span className="font-medium text-gray-900">{val.toLocaleString('fr-FR')} FCFA</span>
                                        </div>
                                      );
                                    }
                                    // Afficher les strings non exclues (si nécessaire, ex: status, etc.)
                                    if (typeof val === 'string' && !excludedKeys.includes(key) && !key.includes('date')) {
                                      return (
                                        <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                          <span className="font-medium text-gray-900">{val}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recap spécifique pour Etudes pour correspondre au design Emprunteur */}
                        {selectedProduct === "confort_etudes" ? (
                          <>
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-blue-500" />
                                  Informations du Contrat
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Âge Parent</span>
                                    <span className="font-medium text-gray-900">{displayData.age_parent || "-"} ans</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Âge Enfant</span>
                                    <span className="font-medium text-gray-900">{displayData.age_enfant || "-"} ans</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Montant Rente Annuelle</span>
                                    <span className="font-bold text-blue-700">{formatCFA(displayData.montant_rente)} FCFA</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Durée Cotisation</span>
                                    <span className="font-medium text-gray-900">{displayData.duree_paiement || "-"} ans</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Durée de Service</span>
                                    <span className="font-medium text-gray-900">{displayData.duree_service || "-"} ans</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-green-500" />
                                  Dates Importantes
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date d'Effet</span>
                                    <span className="font-medium text-gray-900">{displayData.date_effet ? formatDateFull(displayData.date_effet) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">1ère Cotisation</span>
                                    <span className="font-medium text-gray-900">{displayData.date_premiere_cotisation ? formatDateFull(displayData.date_premiere_cotisation) : "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                                <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-purple-500" />
                                  Modalités de Paiement
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Périodicité</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.periodicite || "Mensuelle"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Mode Paiement</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.mode_paiement?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Origine Fonds</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.origine_fonds?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (selectedProduct === "confort_retraite" || selectedProduct === "epargne_plus") ? (
                          <>
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                  <PiggyBank className="w-4 h-4 text-blue-500" />
                                  Informations du Contrat
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                {selectedProduct === "epargne_plus" ? (
                                  /* Champs Spécifiques Epargne Plus */
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Taux Intérêt Annuel</span>
                                      <span className="font-medium text-gray-900">{calculatedResults.taux_interet_annuel_pourcent || "-"} %</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Frais de Gestion</span>
                                      <span className="font-medium text-gray-900">{calculatedResults.taux_frais_gestion_pourcent || "-"} %</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Frais d'Acquisition</span>
                                      <span className="font-medium text-gray-900">{calculatedResults.taux_frais_acquisition_pourcent || "-"} %</span>
                                    </div>
                                    {calculatedResults.taux_penalite_rachat_pourcent !== undefined && Number(calculatedResults.taux_penalite_rachat_pourcent) > 0 && (
                                      <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                        <span className="text-orange-700">Pénalité Rachat (si &lt; 10 ans)</span>
                                        <span className="font-semibold text-orange-700">{calculatedResults.taux_penalite_rachat_pourcent} %</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Champs par défaut (Confort Retraite, etc.) */
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Âge de l'Assuré</span>
                                      <span className="font-medium text-gray-900">{displayData.age || "-"} ans</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Durée</span>
                                      <span className="font-medium text-gray-900">{displayData.duree || "-"} ans</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Prime Périodique</span>
                                      <span className="font-bold text-blue-700">{formatCFA(displayData.prime_periodique_commerciale)} FCFA</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Capital Décès</span>
                                      <span className="font-medium text-gray-900">{formatCFA(displayData.capital_deces)} FCFA</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-green-500" />
                                  Dates Importantes
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date d'Effet</span>
                                    <span className="font-medium text-gray-900">{displayData.date_effet ? formatDateFull(displayData.date_effet) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">1ère Cotisation</span>
                                    <span className="font-medium text-gray-900">{displayData.date_premiere_cotisation ? formatDateFull(displayData.date_premiere_cotisation) : "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                                <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-purple-500" />
                                  Modalités de Paiement
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Périodicité</span>
                                    <span className="font-medium text-gray-900 capitalize">
                                      {displayData.periodicite === "M" ? "Mensuelle" :
                                        displayData.periodicite === "T" ? "Trimestrielle" :
                                          displayData.periodicite === "S" ? "Semestrielle" :
                                            displayData.periodicite === "A" ? "Annuelle" :
                                              (displayData.periodicite || "Mensuelle")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Mode Paiement</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.mode_paiement?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Origine Fonds</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.origine_fonds?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : selectedProduct === "elikia_scolaire" ? (
                          <>


                            {/* Elikia - Informations du Contrat */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-blue-500" />
                                  Informations du Contrat Elikia
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {/* Ligne 0 : Numéro Convention */}
                                  <div className="flex justify-between p-2 bg-gray-50 rounded col-span-1 md:col-span-2">
                                    <span className="text-gray-600">Numéro Convention</span>
                                    <span className="font-medium text-gray-900">{displayData.numero_convention || "-"}</span>
                                  </div>

                                  {/* Ligne 1: Âges */}
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Âge du Parent</span>
                                    <span className="font-medium text-gray-900">{displayData.age_parent || "-"} ans</span>
                                  </div>
                                  {/* Tranche d'Âge (paramètre tarifaire) */}
                                  {calculatedResults.tranche_age && (
                                    <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100">
                                      <span className="text-purple-700 font-medium">Tranche d'Âge</span>
                                      <span className="font-medium text-purple-700">{calculatedResults.tranche_age}</span>
                                    </div>
                                  )}

                                  {/* Ligne 2: Durées */}
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Durée de la Rente</span>
                                    <span className="font-medium text-gray-900">{displayData.duree_rente || "-"} ans</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Durée Engagement</span>
                                    <span className="font-medium text-gray-900">{displayData.duree_engagement || "-"} ans</span>
                                  </div>


                                </div>
                              </div>
                            </div>

                            {/* Elikia - Dates Importantes */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
                                <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-500" />
                                  Dates Importantes
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date de Signature</span>
                                    <span className="font-medium text-gray-900">{displayData.date_signature ? formatDateFull(displayData.date_signature) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date d'Effet</span>
                                    <span className="font-medium text-gray-900">{displayData.date_effet ? formatDateFull(displayData.date_effet) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date 1ère Prime</span>
                                    <span className="font-medium text-gray-900">{displayData.date_premiere_prime ? formatDateFull(displayData.date_premiere_prime) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date d'Échéance</span>
                                    <span className="font-medium text-gray-900">{displayData.date_echeance ? formatDateFull(displayData.date_echeance) : "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Date de Fin</span>
                                    <span className="font-medium text-gray-900">{displayData.date_fin ? formatDateFull(displayData.date_fin) : "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Elikia - Modalités de Paiement */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                                <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-purple-500" />
                                  Modalités de Paiement
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Périodicité</span>
                                    <span className="font-medium text-gray-900">
                                      {displayData.periodicite === 'M' ? 'Mensuelle' :
                                        displayData.periodicite === 'T' ? 'Trimestrielle' :
                                          displayData.periodicite === 'S' ? 'Semestrielle' :
                                            displayData.periodicite === 'A' ? 'Annuelle' :
                                              displayData.periodicite || "Mensuelle"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Mode Paiement</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.mode_paiement?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Origine Fonds</span>
                                    <span className="font-medium text-gray-900 capitalize">{displayData.origine_fonds?.replace(/_/g, ' ') || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : selectedProduct === "mobateli" ? (
                          <>
                            {/* Mobateli - Informations du Contrat */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 border-b border-orange-100">
                                <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-orange-500" />
                                  Garanties {getLabel('mobateli')}
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {/* Badge mode de calcul */}
                                  <div className={`flex justify-between p-2 rounded border col-span-1 md:col-span-2 ${calculatedResults.volet ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <span className={`font-semibold ${calculatedResults.volet ? 'text-indigo-700' : 'text-orange-700'}`}>Mode de Calcul</span>
                                    <span className={`font-bold ${calculatedResults.volet ? 'text-indigo-700' : 'text-orange-700'}`}>
                                      {calculatedResults.volet
                                        ? `Sur Mesure — ${calculatedResults.volet_label || (calculatedResults.volet === 'dtc' ? 'DTC' : 'DTC+FF')}`
                                        : 'Tarifaire'}
                                    </span>
                                  </div>

                                  {/* ===== TARIFAIRE ===== */}
                                  {!calculatedResults.volet && (
                                    <>
                                      {(displayData.capital_dtc_iad || calculatedResults.capital_dtc_iad) && (
                                        <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                          <span className="text-orange-700 font-semibold">Capital DTC/IAD</span>
                                          <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc_iad || displayData.capital_dtc_iad)} FCFA</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Âge de l'Assuré</span>
                                        <span className="font-medium text-gray-900">{calculatedResults.age || displayData.age || "-"} ans</span>
                                      </div>
                                      {calculatedResults.tranche_age && (
                                        <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
                                          <span className="text-blue-700 font-semibold">Tranche d'âge</span>
                                          <span className="font-bold text-blue-700">{calculatedResults.tranche_age}</span>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* ===== SUR MESURE DTC ===== */}
                                  {calculatedResults.volet === 'dtc' && (
                                    <>
                                      {calculatedResults.capital_dtc_iad !== undefined && (
                                        <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                          <span className="text-orange-700 font-semibold">Capital DTC/IAD (calculé)</span>
                                          <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc_iad)} FCFA</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Âge de l'Assuré</span>
                                        <span className="font-medium text-gray-900">{calculatedResults.age || displayData.age || "-"} ans</span>
                                      </div>
                                      {calculatedResults.duree !== undefined && (
                                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-gray-600">Durée</span>
                                          <span className="font-medium text-gray-900">{calculatedResults.duree} an(s)</span>
                                        </div>
                                      )}
                                      {calculatedResults.type_prime_label && (
                                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-gray-600">Type de Prime</span>
                                          <span className="font-medium text-gray-900">{calculatedResults.type_prime_label}</span>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* ===== SUR MESURE DTC+FF ===== */}
                                  {calculatedResults.volet === 'dtc_ff' && (
                                    <>
                                      {calculatedResults.capital_dtc !== undefined && (
                                        <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-100">
                                          <span className="text-orange-700 font-semibold">Capital DTC</span>
                                          <span className="font-bold text-orange-700">{formatCFA(calculatedResults.capital_dtc)} FCFA</span>
                                        </div>
                                      )}
                                      {calculatedResults.frais_funeraires && (
                                        <div className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100">
                                          <span className="text-purple-700 font-semibold">Frais Funéraires</span>
                                          <span className="font-bold text-purple-700">{formatCFA(calculatedResults.frais_funeraires.total)} FCFA</span>
                                        </div>
                                      )}
                                      {calculatedResults.capital_total !== undefined && (
                                        <div className="flex justify-between p-2 bg-amber-50 rounded border border-amber-200">
                                          <span className="text-amber-800 font-semibold">Capital Total (DTC + FF)</span>
                                          <span className="font-bold text-amber-800">{formatCFA(calculatedResults.capital_total)} FCFA</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-gray-600">Âge de l'Assuré</span>
                                        <span className="font-medium text-gray-900">{calculatedResults.age || displayData.age || "-"} ans</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-3">Décès Toutes Causes / Invalidité Absolue et Définitive</p>
                              </div>
                            </div>

                            {/* Mobateli - Dates Importantes */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-green-500" />
                                  Dates Importantes
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  {displayData.date_souscription && (
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Date de Souscription</span>
                                      <span className="font-medium text-gray-900">{formatDateFull(displayData.date_souscription)}</span>
                                    </div>
                                  )}
                                  {displayData.date_effet && (
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Date d'Effet</span>
                                      <span className="font-medium text-gray-900">{formatDateFull(displayData.date_effet)}</span>
                                    </div>
                                  )}
                                  {displayData.date_premiere_prime && (
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">1ère Prime</span>
                                      <span className="font-medium text-gray-900">{formatDateFull(displayData.date_premiere_prime)}</span>
                                    </div>
                                  )}
                                  {displayData.date_echeance && (
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Date d'Échéance</span>
                                      <span className="font-medium text-gray-900">{formatDateFull(displayData.date_echeance)}</span>
                                    </div>
                                  )}
                                  {!displayData.date_souscription && !displayData.date_effet && !displayData.date_premiere_prime && !displayData.date_echeance && (
                                    <div className="col-span-3 text-center text-gray-400 py-2">
                                      Aucune date renseignée
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mobateli - Modalités de Paiement (forfaitaire uniquement) */}
                            {!calculatedResults.volet && (
                              <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                                  <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-purple-500" />
                                    Modalités de Paiement
                                  </h3>
                                </div>
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Périodicité</span>
                                      <span className="font-medium text-gray-900 capitalize">{displayData.periodicite || "Mensuelle"}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Mode Paiement</span>
                                      <span className="font-medium text-gray-900 capitalize">{displayData.mode_paiement?.replace(/_/g, ' ') || "-"}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-gray-600">Origine Fonds</span>
                                      <span className="font-medium text-gray-900 capitalize">{displayData.origine_fonds?.replace(/_/g, ' ') || "-"}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Fallback générique pour autres produits */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                  <HandCoins className="w-4 h-4 text-gray-500" />
                                  Détails du Produit
                                </h3>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {/* Champs Mobateli */}
                                  {displayData.capital_dtc_iad !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Capital DTC/IAD:</span>
                                      <span className="font-medium float-right">{Number(displayData.capital_dtc_iad).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}

                                  {/* Champs Retraite / Epargne Plus */}
                                  {displayData.prime_periodique_commerciale !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Prime Périodique:</span>
                                      <span className="font-medium float-right">{Number(displayData.prime_periodique_commerciale).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}
                                  {displayData.capital_deces !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Capital Décès:</span>
                                      <span className="font-medium float-right">{Number(displayData.capital_deces).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}
                                  {displayData.capital_garanti !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Capital Garanti:</span>
                                      <span className="font-medium float-right">{Number(displayData.capital_garanti).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}
                                  {displayData.nombre_periodes !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Nombre de Périodes:</span>
                                      <span className="font-medium float-right">{displayData.nombre_periodes}</span>
                                    </div>
                                  )}

                                  {/* Champs Confort Etudes (Fallback if needed) */}
                                  {displayData.montant_rente !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Montant Rente Annuelle:</span>
                                      <span className="font-medium float-right">{Number(displayData.montant_rente).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}

                                  {/* Elikia */}
                                  {displayData.rente_annuelle !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Rente Annuelle:</span>
                                      <span className="font-medium float-right">{Number(displayData.rente_annuelle).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}
                                  {displayData.capital_unique !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Capital Garanti:</span>
                                      <span className="font-medium float-right">{Number(displayData.capital_unique).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                  )}

                                  {/* Âges et Durées communs */}
                                  {displayData.age !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Âge:</span>
                                      <span className="font-medium float-right">{displayData.age} ans</span>
                                    </div>
                                  )}
                                  {displayData.age_parent !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Âge Parent:</span>
                                      <span className="font-medium float-right">{displayData.age_parent} ans</span>
                                    </div>
                                  )}
                                  {displayData.age_enfant !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Âge Enfant:</span>
                                      <span className="font-medium float-right">{displayData.age_enfant} ans</span>
                                    </div>
                                  )}
                                  {displayData.duree !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Durée:</span>
                                      <span className="font-medium float-right">{displayData.duree} ans</span>
                                    </div>
                                  )}
                                  {displayData.duree_rente !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Durée Rente:</span>
                                      <span className="font-medium float-right">{displayData.duree_rente} ans</span>
                                    </div>
                                  )}
                                  {displayData.duree_paiement !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Durée Cotisation:</span>
                                      <span className="font-medium float-right">{displayData.duree_paiement} ans</span>
                                    </div>
                                  )}
                                  {displayData.duree_service !== undefined && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Durée Service:</span>
                                      <span className="font-medium float-right">{displayData.duree_service} ans</span>
                                    </div>
                                  )}
                                  {displayData.periodicite && (
                                    <div className="p-2">
                                      <span className="text-gray-600">Périodicité:</span>
                                      <span className="font-medium float-right capitalize">{displayData.periodicite}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Section Bénéficiaires */}
                    {beneficiaires.length > 0 && (
                      <div className="border rounded-xl overflow-hidden shadow-sm mt-4">
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                          <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            Bénéficiaires ({beneficiaires.length})
                          </h3>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="space-y-2">
                            {beneficiaires.map((ben, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                                    {ben.ordre}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{ben.nom_prenoms}</p>
                                    <p className="text-xs text-gray-500 capitalize">{ben.qualite}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                                    {ben.part_pourcentage}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total des parts</span>
                            <span className="font-bold text-green-600">
                              {beneficiaires.reduce((sum, b) => sum + b.part_pourcentage, 0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <p className="text-blue-800 font-medium text-center">
                  Simulation effectuée avec succès. Veuillez vérifier les informations avant de sauvegarder.
                </p>
              </div>
            </CardContent >
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="destructive" onClick={() => router.push("/simulations")}>Abandonner</Button>
            <Button variant="outline" onClick={() => setWizardStep(2)}>Modifier</Button>
            <Button onClick={onStep3Submit} disabled={isStep2Submitting} className="bg-green-600 hover:bg-green-700">
              {isStep2Submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Sauvegarder et Continuer
                </>
              )}
            </Button>
          </div>
        </div>
        </StepContainer>
      )
      }

      {/* ÉTAPE 4 : Questionnaire Médical */}
      {
        wizardData.step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              {/* Pas de retour possible vers l'étape 3 une fois sauvegardé, ou alors en mode édition */}
              <h2 className="text-xl font-semibold">Questionnaire Médical</h2>
            </div>

            {isStep2Submitting ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Traitement du questionnaire...</p>
              </div>
            ) : (
              <MedicalForm
                isWizardMode={true}
                initialData={wizardData.questionnaireData}
                onSubmit={onStep4Submit}
                simulationReference={wizardData.simulationData?.reference}
              />
            )}
          </div>
        )
      }

      {/* ÉTAPE 5 : Validation BIA */}
      {
        wizardData.step === 5 && (
          <div className="space-y-6">
            {/* Header with back button and title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setWizardStep(4)} className="hover:bg-gray-100">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Validation BIA</h2>
                  <p className="text-sm text-gray-500">Vérifiez les informations avant validation finale</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Prêt à valider</span>
              </div>
            </div>

            {wizardData.biaInfo ? (
              <>
                {/* Main Content Grid */}
                {(() => {
                  const apiSimulation = wizardData.biaInfo?.simulation || {};
                  const apiRoot = wizardData.biaInfo || {};
                  const localData = wizardData.simulationData || {};
                  const calculatedResults = localData.resultats_calcul || {};
                  // Get donnees_entree from apiSimulation first (most reliable after save)
                  const donneesEntree = apiSimulation.donnees_entree || localData.donnees_entree || {};
                  // Get resultats_calcul from apiSimulation (after save) or local
                  // Merge results to ensure local fields persist if missing from API response (partial update)
                  const apiResultats = {
                    ...(calculatedResults || {}),
                    ...(apiSimulation.resultats_calcul || {}),
                    // Force check nested resultats_calcul in case of structure mismatch
                    ...((apiSimulation.resultats?.resultats_calcul) || {})
                  };

                  console.log("DEBUG STEP 5 BIA:", {
                    apiSimulation,
                    calculatedResults,
                    apiResultats,
                    cumul: apiResultats.cumul_cotisations,
                    interets: apiResultats.interets_totaux
                  });

                  // Check if this is Études product (uses Capital/prime_unique instead of Prime Totale)
                  const isEtudesProduct = (localData.produit || apiSimulation.produit) === 'confort_etudes' ||
                    (localData.produit || apiSimulation.produit) === 'etudes';

                  const info = {
                    ...localData,
                    ...apiRoot,
                    ...apiSimulation,
                    nom: apiSimulation.nom || apiSimulation.nom_client || localData.nom,
                    prenom: apiSimulation.prenom || apiSimulation.prenom_client || localData.prenom,
                    email: apiSimulation.email || apiSimulation.email_client || localData.email,
                    produit: localData.produit || apiSimulation.produit,
                    // Get date_effet from multiple sources - donnees_entree is most reliable after save
                    date_effet: donneesEntree.date_effet || apiSimulation.donnees_entree?.date_effet || localData.date_effet || apiSimulation.date_effet || new Date().toISOString().split('T')[0],
                    // Get calculated values from apiResultats (after save) or calculatedResults (local)
                    prime_totale: apiResultats.prime_totale || calculatedResults.prime_totale || localData.prime_totale,
                    prime_unique: apiResultats.prime_unique || calculatedResults.prime_unique,
                    prime_annuelle: apiResultats.prime_annuelle || calculatedResults.prime_annuelle,
                    capital_garanti: apiResultats.capital_garanti || calculatedResults.capital_garanti,
                    prime_mensuelle: apiResultats.prime_mensuelle || calculatedResults.prime_mensuelle,
                    prime_nette: apiResultats.prime_nette || calculatedResults.prime_nette,
                    net_a_debourser: apiResultats.net_a_debourser || calculatedResults.net_a_debourser,
                    frais_accessoires: apiResultats.frais_accessoires || calculatedResults.frais_accessoires,
                    montant_rente_annuel: apiResultats.montant_rente_annuel || calculatedResults.montant_rente_annuel,
                    cotisation_totale: apiResultats.cotisation_totale || calculatedResults.cotisation_totale,
                    duree_paiement: apiResultats.duree_paiement || calculatedResults.duree_paiement || donneesEntree.duree_paiement,
                    duree_service: apiResultats.duree_service || calculatedResults.duree_service || donneesEntree.duree_service,
                    // Epargne Plus specific - Direct fallback to known paths
                    cumul_cotisations: apiResultats.cumul_cotisations || calculatedResults.cumul_cotisations || apiSimulation.resultats?.cumul_cotisations,
                    interets_totaux: apiResultats.interets_totaux || calculatedResults.interets_totaux || apiSimulation.resultats?.interets_totaux,
                    frais_adhesion: apiResultats.frais_adhesion || calculatedResults.frais_adhesion || apiSimulation.resultats?.frais_adhesion,
                    taux_interet_annuel_pourcent: apiResultats.taux_interet_annuel_pourcent || calculatedResults.taux_interet_annuel_pourcent,
                    nombre_mensualites: apiResultats.nombre_mensualites || calculatedResults.nombre_mensualites,
                    // Mobateli Sur Mesure: capital_dtc_iad est un RÉSULTAT calculé (volet DTC)
                    capital_dtc_iad: apiResultats.capital_dtc_iad || calculatedResults.capital_dtc_iad || donneesEntree.capital_dtc_iad,

                    // Explicitly keep the original user input for labeling purposes
                    prime_periodique_saisie: localData.prime_periodique_commerciale,

                    // API-calculated commercial total
                    prime_periodique_commerciale_api: apiResultats.prime_periodique_commerciale,
                    // Flag for product type
                    isEtudesProduct,
                  };

                  const questionnaire = wizardData.biaInfo?.["questionnaire medical"] || wizardData.questionnaireData || {};

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Client Info & Questionnaire */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Reference Card */}
                        <Card className="border-l-4 border-l-blue-500 shadow-sm">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Référence BIA</p>
                                  <p className="text-xl font-bold text-gray-900">{info.reference || "En attente de génération"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Date d'effet</p>
                                <p className="text-base font-semibold text-gray-700">{formatDateFull(info.date_effet || info.date_creation || info.created_at) || "Non définie"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Client Info Card */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-purple-600" />
                              </div>
                              <CardTitle className="text-lg">Informations de l'Assuré</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Nom complet</p>
                                <p className="text-base font-semibold text-gray-900">{info.prenom_client || info.prenom} {info.nom_client || info.nom}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Date de naissance</p>
                                <p className="text-base font-semibold text-gray-900">{formatDateFull(info.date_naissance) || "-"}</p>
                              </div>
                              {info.lieu_naissance && (
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Lieu de naissance</p>
                                  <p className="text-base text-gray-700">{info.lieu_naissance}</p>
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Email</p>
                                <p className="text-base text-gray-700">{info.email_client || info.email || "-"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Téléphone</p>
                                <p className="text-base text-gray-700">{info.telephone_client || info.telephone || "-"}</p>
                              </div>
                              {info.adresse && (
                                <div className="space-y-1 col-span-2">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Adresse</p>
                                  <p className="text-base text-gray-700">{info.adresse}</p>
                                </div>
                              )}
                              {info.profession && (
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Profession</p>
                                  <p className="text-base text-gray-700">{info.profession}</p>
                                </div>
                              )}
                              {info.employeur && (
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Employeur</p>
                                  <p className="text-base text-gray-700">{info.employeur}</p>
                                </div>
                              )}
                              {info.numero_compte && (
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">N° Compte</p>
                                  <p className="text-base text-gray-700 font-mono">{info.numero_compte}</p>
                                </div>
                              )}
                              {info.situation_matrimoniale && (
                                <div className="space-y-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Situation matrimoniale</p>
                                  <p className="text-base text-gray-700 capitalize">{info.situation_matrimoniale}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Beneficiaires Card */}
                        {beneficiaires.length > 0 && (
                          <Card className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <CardTitle className="text-lg">Bénéficiaires</CardTitle>
                                </div>
                                <span className="text-sm text-gray-500">{beneficiaires.length} bénéficiaire(s)</span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {beneficiaires.map((ben, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                        {ben.ordre}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-900">{ben.nom_prenoms}</p>
                                        <p className="text-xs text-gray-500 capitalize">{ben.qualite}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                                        {ben.part_pourcentage}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Total des parts</span>
                                <span className="text-lg font-bold text-green-600">
                                  {beneficiaires.reduce((sum, b) => sum + b.part_pourcentage, 0)}%
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Questionnaire Card (if present) */}
                        {questionnaire && Object.keys(questionnaire).length > 0 && (
                          <Card className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                  <Heart className="h-4 w-4 text-red-600" />
                                </div>
                                <CardTitle className="text-lg">Questionnaire Médical</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                  <p className="text-2xl font-bold text-gray-900">{questionnaire.taille_cm || "-"}</p>
                                  <p className="text-xs text-gray-500 mt-1">Taille (cm)</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                  <p className="text-2xl font-bold text-gray-900">{questionnaire.poids_kg || "-"}</p>
                                  <p className="text-xs text-gray-500 mt-1">Poids (kg)</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${questionnaire.fumeur ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {questionnaire.fumeur ? "Fumeur" : "Non-fumeur"}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Right Column: Product & Primes */}
                      <div className="space-y-6">
                        {/* Product Card */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-blue-200" />
                              <p className="text-sm text-blue-200 font-medium">Produit sélectionné</p>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold mb-4">
                              {info.produit ? getLabel(info.produit) : "-"}
                            </p>

                            <div className="h-px bg-white/20 my-4"></div>

                            <div className="space-y-3">
                              {/* Show Capital for Études (uses cotisation_totale) */}
                              {info.isEtudesProduct ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-blue-200">Cotisation Totale</span>
                                  <span className="text-2xl font-bold">{formatCFA(info.cotisation_totale || 0)} FCFA</span>
                                </div>
                              ) : info.produit === 'epargne_plus' ? (
                                /* Epargne Plus: Cumul Cotisations, Durée & Prime Mensuelle */
                                <>
                                  {/* Cumul Cotisations */}
                                  {info.cumul_cotisations !== undefined && (
                                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3 mb-2">
                                      <span className="text-blue-100 font-semibold">Cumul Cotisations</span>
                                      <span className="text-2xl font-bold text-yellow-300">{formatCFA(info.cumul_cotisations)} FCFA</span>
                                    </div>
                                  )}

                                  {/* Durée de contrat */}
                                  {(info.duree_annees !== undefined || info.duree !== undefined) && (
                                    <div className="flex justify-between items-center text-sm py-1 border-b border-white/10">
                                      <span className="text-blue-200">Durée de contrat</span>
                                      <span className="font-semibold">{info.duree_annees || info.duree} ans</span>
                                    </div>
                                  )}

                                  {/* Prime Mensuelle */}
                                  {(info.cotisation_mensuelle !== undefined || info.prime_periodique_saisie !== undefined || info.prime_mensuelle !== undefined) && (
                                    <div className="flex justify-between items-center text-sm py-1">
                                      <span className="text-blue-200">Prime mensuelle</span>
                                      <span className="font-semibold">{formatCFA(info.cotisation_mensuelle || info.prime_periodique_saisie || info.prime_mensuelle)} FCFA</span>
                                    </div>
                                  )}
                                </>
                              ) : info.produit === 'confort_retraite' ? (
                                /* For Retraite products: Highlight Capital Garanti, Prime Totale goes to financial details */
                                <>
                                  {info.capital_garanti !== undefined && (
                                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                                      <span className="text-blue-100 font-semibold">Capital Garanti</span>
                                      <span className="text-2xl font-bold text-yellow-300">{formatCFA(info.capital_garanti)} FCFA</span>
                                    </div>
                                  )}
                                  {info.capital_deces !== undefined && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-blue-200">Capital Décès</span>
                                      <span className="font-semibold">{formatCFA(info.capital_deces)} FCFA</span>
                                    </div>
                                  )}
                                </>
                              ) : info.produit === 'elikia_scolaire' ? (
                                /* For Elikia: Only show Rente Annuelle in product highlights (rest goes to financial details) */
                                <>
                                  {info.rente_annuelle !== undefined && (
                                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                                      <span className="text-blue-100 font-semibold">Rente Annuelle</span>
                                      <span className="text-2xl font-bold text-yellow-300">{formatCFA(info.rente_annuelle)} FCFA</span>
                                    </div>
                                  )}
                                  {info.capital_garanti !== undefined && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-blue-200">Capital Garanti</span>
                                      <span className="font-semibold">{formatCFA(info.capital_garanti)} FCFA</span>
                                    </div>
                                  )}
                                </>
                              ) : info.produit === 'mobateli' ? (
                                /* For Mobateli: Highlight Capital DTC/IAD and Tranche d'âge */
                                <>
                                  {info.capital_dtc_iad !== undefined && (
                                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-3">
                                      <span className="text-blue-100 font-semibold">Capital DTC/IAD</span>
                                      <span className="text-2xl font-bold text-yellow-300">{formatCFA(info.capital_dtc_iad)} FCFA</span>
                                    </div>
                                  )}
                                  {info.tranche_age && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-blue-200">Tranche d'âge</span>
                                      <span className="font-semibold">{info.tranche_age}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <span className="text-blue-200">Prime Totale</span>
                                  <span className="text-2xl font-bold">{formatCFA(info.prime_totale || 0)} FCFA</span>
                                </div>
                              )}

                              {info.prime_mensuelle && info.produit !== 'confort_etudes' && info.produit !== 'elikia_scolaire' && info.produit !== 'mobateli' && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-blue-200">Mensualité</span>
                                  <span className="font-semibold">{formatCFA(info.prime_mensuelle)} FCFA</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Financial Details Card */}
                        <Card className="shadow-sm">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </div>
                              <CardTitle className="text-lg">Détails Financiers</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {info.montant_pret && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Montant Prêt</span>
                                <span className="font-semibold">{formatCFA(info.montant_pret)} FCFA</span>
                              </div>
                            )}
                            {info.duree_mois && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Durée</span>
                                <span className="font-semibold">{info.duree_mois} mois</span>
                              </div>
                            )}
                            {info.prime_nette && info.produit !== 'mobateli' && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Prime Nette</span>
                                <span className="font-semibold">{formatCFA(info.prime_nette)} FCFA</span>
                              </div>
                            )}
                            {/* Études-specific fields */}
                            {info.montant_rente_annuel && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Rente Annuelle</span>
                                <span className="font-semibold">{formatCFA(info.montant_rente_annuel)} FCFA</span>
                              </div>
                            )}
                            {info.prime_unique && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Capital Unique</span>
                                <span className="font-semibold">{formatCFA(info.prime_unique)} FCFA</span>
                              </div>
                            )}
                            {info.prime_annuelle && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Prime Annuelle</span>
                                <span className="font-semibold">{formatCFA(info.prime_annuelle)} FCFA</span>
                              </div>
                            )}
                            {/* Elikia-specific: Full Financial Details */}
                            {info.produit === 'elikia_scolaire' && (
                              <>
                                {info.prime_nette_annuelle && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Prime Nette Annuelle</span>
                                    <span className="font-semibold">{formatCFA(info.prime_nette_annuelle)} FCFA</span>
                                  </div>
                                )}
                                {info.prime_mensuelle && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Prime Mensuelle</span>
                                    <span className="font-semibold">{formatCFA(info.prime_mensuelle)} FCFA</span>
                                  </div>
                                )}
                                {info.frais_accessoires && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Frais Accessoires</span>
                                    <span className="font-semibold">{formatCFA(info.frais_accessoires)} FCFA</span>
                                  </div>
                                )}
                                {info.prime_totale && (
                                  <div className="flex justify-between py-2 border-b border-green-100 bg-green-50/50 -mx-4 px-4">
                                    <span className="text-green-700 font-medium">Prime Totale</span>
                                    <span className="font-bold text-green-700">{formatCFA(info.prime_totale)} FCFA</span>
                                  </div>
                                )}
                              </>
                            )}
                            {/* Mobateli-specific: Full Financial Details */}
                            {info.produit === 'epargne_plus' && (
                              <>
                                {info.interets_totaux !== undefined && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Intérêts Totaux</span>
                                    <span className="font-semibold">{formatCFA(info.interets_totaux)} FCFA</span>
                                  </div>
                                )}
                                {info.frais_adhesion !== undefined && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Frais d'Adhésion</span>
                                    <span className="font-semibold">{formatCFA(info.frais_adhesion)} FCFA</span>
                                  </div>
                                )}
                                {info.taux_interet_annuel_pourcent !== undefined && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Taux Intérêt Annuel</span>
                                    <span className="font-semibold">{info.taux_interet_annuel_pourcent} %</span>
                                  </div>
                                )}
                                {info.nombre_mensualites !== undefined && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Nombre de mensualités</span>
                                    <span className="font-semibold">{info.nombre_mensualites} mois</span>
                                  </div>
                                )}
                              </>
                            )}
                            {info.produit === 'mobateli' && (
                              <>
                                {info.prime_nette && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Prime Nette</span>
                                    <span className="font-semibold">{formatCFA(info.prime_nette)} FCFA</span>
                                  </div>
                                )}
                                {info.prime_mensuelle && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Prime Mensuelle</span>
                                    <span className="font-semibold">{formatCFA(info.prime_mensuelle)} FCFA</span>
                                  </div>
                                )}
                                {info.frais_accessoires && (
                                  <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Frais Accessoires</span>
                                    <span className="font-semibold">{formatCFA(info.frais_accessoires)} FCFA</span>
                                  </div>
                                )}
                                {info.prime_totale && (
                                  <div className="flex justify-between py-2 border-b border-green-100 bg-green-50/50 -mx-4 px-4">
                                    <span className="text-green-700 font-medium">Prime Totale</span>
                                    <span className="font-bold text-green-700">{formatCFA(info.prime_totale)} FCFA</span>
                                  </div>
                                )}
                              </>
                            )}
                            {info.frais_accessoires && !['confort_retraite', 'epargne_plus', 'elikia_scolaire', 'mobateli'].includes(info.produit) && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Frais Accessoires</span>
                                <span className="font-semibold">{formatCFA(info.frais_accessoires)} FCFA</span>
                              </div>
                            )}
                            {info.duree_paiement && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Durée Cotisation</span>
                                <span className="font-semibold">{info.duree_paiement} ans</span>
                              </div>
                            )}
                            {info.duree_service && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Durée Service</span>
                                <span className="font-semibold">{info.duree_service} ans</span>
                              </div>
                            )}
                            {info.surprime_montant && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Surprime</span>
                                <span className="font-semibold text-orange-600">{formatCFA(info.surprime_montant)} FCFA</span>
                              </div>
                            )}
                            {info.prime_epargne && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Prime Épargne</span>
                                <span className="font-semibold">{formatCFA(info.prime_epargne)} FCFA</span>
                              </div>
                            )}
                            {info.prime_deces && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Prime Décès</span>
                                <span className="font-semibold">{formatCFA(info.prime_deces)} FCFA</span>
                              </div>
                            )}
                            {info.net_a_debourser && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                {/*<span className="text-gray-500">Net à débourser</span>
                              <span className="font-bold text-blue-600">{Number(info.net_a_debourser).toLocaleString()} FCFA</span>*/}
                              </div>
                            )}
                            {info.prime_periodique_saisie && (
                              <div className="flex justify-between py-2 border-b border-gray-100 italic text-gray-400">
                                <span className="">Prime Périodique (Saisie)</span>
                                <span className="font-semibold">{formatCFA(info.prime_periodique_saisie)} FCFA</span>
                              </div>
                            )}
                            {info.frais_accessoires && ['confort_retraite', 'epargne_plus'].includes(info.produit) && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Frais Accessoires</span>
                                <span className="font-semibold">{formatCFA(info.frais_accessoires)} FCFA</span>
                              </div>
                            )}
                            {info.prime_periodique_commerciale_api && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 font-semibold text-blue-600">Prime Périodique Commerciale</span>
                                <span className="font-bold text-blue-600">{formatCFA(info.prime_periodique_commerciale_api)} FCFA</span>
                              </div>
                            )}
                            {info.capital_garanti !== undefined && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Capital Garanti</span>
                                <span className="font-semibold text-purple-600">{formatCFA(info.capital_garanti)} FCFA</span>
                              </div>
                            )}
                            {info.capital_deces !== undefined && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Capital Décès</span>
                                <span className="font-semibold">{formatCFA(info.capital_deces)} FCFA</span>
                              </div>
                            )}
                            {/* Prime Totale in financial details for Retraite products */}
                            {info.prime_totale !== undefined && ['confort_retraite', 'epargne_plus'].includes(info.produit) && (
                              <div className="flex justify-between py-3 border-b-2 border-green-200 bg-green-50 rounded mt-2 -mx-2 px-2">
                                <span className="text-green-800 font-bold">Prime Totale</span>
                                <span className="font-bold text-green-800">{formatCFA(info.prime_totale)} FCFA</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <p className="text-sm text-gray-500">
                    En cliquant sur "Confirmer et Valider", le BIA sera généré et finalisé.
                  </p>
                  <Button
                    onClick={onFinalSubmit}
                    disabled={isFinalSubmitting}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all px-8"
                  >
                    {isFinalSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Validation en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Confirmer et Valider
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="h-6 w-6" />
                    <p className="font-medium">Impossible de charger les informations du BIA.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      }
    </div>
  );
}
