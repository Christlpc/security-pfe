"use client";

import { startTransition, useEffect, useState } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker";
import { RiskScoreDisplay } from "@/components/questionnaire/RiskScoreDisplay";
import { simulationApi } from "@/lib/api/simulations";
import { questionnairesApi } from "@/lib/api/simulations";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { MedicalScoring } from "@/src/domain/medical/MedicalScoring";
import type { QuestionnaireMedical } from "@/types";
import toast from "react-hot-toast";
import { Loader2, ArrowRight, Activity, Heart, Ruler, Scale, AlertCircle } from "lucide-react";
import { StepCard, StepSectionHeader } from "../simulations/SimulationStepper";

const questionnaireSchema = z.object({
  // Use coerce to auto-convert string inputs to numbers (handles pre-filled data from API)
  taille_cm: z.coerce.number().min(100, "Taille minimum: 100 cm").max(250, "Taille maximum: 250 cm"),
  poids_kg: z.coerce.number().min(30, "Poids minimum: 30 kg").max(200, "Poids maximum: 200 kg"),
  tension_arterielle: z.string().optional(),
  fumeur: z.boolean(),
  nb_cigarettes_jour: z.number().min(0).optional(),
  consomme_alcool: z.boolean(),
  distractions: z.string().optional(),
  pratique_sport: z.boolean(),
  type_sport: z.string().optional(),
  a_infirmite: z.boolean(),
  malade_6_derniers_mois: z.boolean(),
  souvent_fatigue: z.boolean(),
  perte_poids_recente: z.boolean(),
  prise_poids_recente: z.boolean(),
  a_ganglions: z.boolean(),
  fievre_persistante: z.boolean(),
  plaies_buccales: z.boolean(),
  diarrhee_frequente: z.boolean(),
  ballonnement: z.boolean(),
  oedemes_membres_inferieurs: z.boolean(),
  essoufflement: z.boolean(),
  a_eu_perfusion: z.boolean(),
  a_eu_transfusion: z.boolean(),
  est_hypertendu: z.boolean().optional(),
  est_diabetique: z.boolean().optional(),
  infos_complementaires: z.string().optional(),
  commentaire_medical: z.string().optional(),
  // Details data structure (not sent directly to main endpoint, but managed in form)
  details: z.record(z.object({
    precisez: z.string().min(1, "Veuillez préciser"),
    periode_traitement: z.string().optional(),
    date_debut: z.string().optional(),
    date_fin: z.string().optional(),
    lieu_traitement: z.string().min(1, "Veuillez indiquer le lieu"),
  })).optional(),
});

type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;

interface MedicalFormProps {
  simulationId?: string;
  initialData?: any;
  onSubmit?: (data: QuestionnaireFormData) => void;
  isWizardMode?: boolean;
  simulationReference?: string; // Add optional prop
}

export const MEDICAL_QUESTIONS = [
  { id: "a_infirmite", label: "1. Souffrez-vous d'infirmité ou de malformation ?" },
  { id: "malade_6_derniers_mois", label: "2. Avez-vous été malade au cours des 6 derniers mois ?" },
  { id: "souvent_fatigue", label: "3. Vous sentez-vous fatigué(e) fréquemment ?" },
  { id: "perte_poids_recente", label: "4a. Avez-vous constaté une perte de poids importante ?" },
  { id: "prise_poids_recente", label: "4b. Avez-vous constaté une prise de poids importante ?" },
  { id: "a_ganglions", label: "5. Avez-vous des ganglions, furoncles ou abcès ?" },
  { id: "fievre_persistante", label: "6. Avez-vous une fièvre persistante ?" },
  { id: "plaies_buccales", label: "7. Avez-vous des plaies buccales (bouche) ?" },
  { id: "diarrhee_frequente", label: "8. Souffrez-vous de diarrhée fréquente ?" },
  { id: "ballonnement", label: "9. Avez-vous des ballonnements abdominaux ?" },
  { id: "oedemes_membres_inferieurs", label: "10. Avez-vous des œdèmes des membres inférieurs (OMI) ?" },
  { id: "essoufflement", label: "11. Êtes-vous facilement essoufflé(e) ?" },
  { id: "a_eu_perfusion", label: "12. Avez-vous déjà subi une perfusion ?" },
  { id: "a_eu_transfusion", label: "13. Avez-vous déjà reçu une transfusion sanguine ?" },
  { id: "est_hypertendu", label: "14. Souffrez-vous d'hypertension artérielle ?" },
  { id: "est_diabetique", label: "15. Souffrez-vous de diabète ?" },
];

export function MedicalForm({ simulationId, initialData, onSubmit: onWizardSubmit, isWizardMode = false, simulationReference: propSimulationReference }: MedicalFormProps) {
  const router = useSafeRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoreData, setScoreData] = useState<{
    imc: number;
    scoreTotal: number;
    tauxSurprime: number | string;
    categorieRisque: string;
  } | null>(null);

  const { fetchSimulation, currentSimulation } = useSimulationStore();
  const [simulationReference, setSimulationReference] = useState<string | null>(propSimulationReference || null);
  const [existingDetailsIds, setExistingDetailsIds] = useState<Record<string, number>>({});

  useEffect(() => {
    if (propSimulationReference) {
      setSimulationReference(propSimulationReference);
    }
  }, [propSimulationReference]);

  useEffect(() => {
    if (isWizardMode || !simulationId) return;

    const loadSimulation = async () => {
      if (currentSimulation && currentSimulation.id === simulationId) {
        setSimulationReference(currentSimulation.reference);
        return;
      }
      try {
        await fetchSimulation(simulationId);
      } catch (error) {
        console.error("Erreur récupération simulation:", error);
      }
    };
    loadSimulation();
  }, [simulationId, fetchSimulation, currentSimulation, isWizardMode]);

  useEffect(() => {
    if (isWizardMode) return;
    if (currentSimulation && currentSimulation.id === simulationId) {
      setSimulationReference(currentSimulation.reference);
    }
  }, [currentSimulation, simulationId, isWizardMode]);



  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: initialData || {
      fumeur: false,
      consomme_alcool: false,
      pratique_sport: false,
      a_infirmite: false,
      malade_6_derniers_mois: false,
      souvent_fatigue: false,
      perte_poids_recente: false,
      prise_poids_recente: false,
      a_ganglions: false,
      fievre_persistante: false,
      plaies_buccales: false,
      diarrhee_frequente: false,
      ballonnement: false,
      oedemes_membres_inferieurs: false,
      essoufflement: false,
      a_eu_perfusion: false,
      a_eu_transfusion: false,
      est_hypertendu: false,
      est_diabetique: false,
    },
  });



  // We need to register the details fields manually or let React Hook Form handle deep nesting.
  // Since key is dynamic (question ID), we'll rely on register(`details.${questionId}.field`)

  useEffect(() => {
    const loadData = async () => {
      if (!simulationId) return;
      const existing = await findExistingQuestionnaire(simulationId, simulationReference);
      if (existing) {
        // Prepare details map
        const detailsMap: any = {};
        // @ts-ignore
        if (existing.fetchedDetails && Array.isArray(existing.fetchedDetails)) {
          // @ts-ignore
          existing.fetchedDetails.forEach((d: any) => {
            detailsMap[d.question_field] = {
              precisez: d.precisez,
              periode_traitement: d.periode_traitement,
              lieu_traitement: d.lieu_traitement
            };
            // Stocker l'ID pour la mise à jour
            setExistingDetailsIds(prev => ({ ...prev, [d.question_field]: d.id }));
            // Set fields values
            setValue(d.question_field as any, true as any); // Set question to yes
          });
        }

        reset({
          ...existing,
          taille_cm: Number(existing.taille_cm),
          poids_kg: Number(existing.poids_kg),
          nb_cigarettes_jour: existing.nb_cigarettes_jour || undefined,
          details: Object.keys(detailsMap).length > 0 ? detailsMap : undefined
        });
      }
    };

    if (!initialData && !isWizardMode) {
      loadData();
    }
  }, [simulationId, simulationReference, isWizardMode, initialData, reset, setValue]);

  // Handle initialData changes in wizard mode (for edit page)
  useEffect(() => {
    if (isWizardMode && initialData && Object.keys(initialData).length > 0) {
      console.log("📋 MedicalForm: Applying initialData in wizard mode:", initialData);

      // Helper to safely convert to number (handles strings, NaN, undefined)
      const safeNumber = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : Number(val);
        return isNaN(num) ? undefined : num;
      };

      const taille = safeNumber(initialData.taille_cm);
      const poids = safeNumber(initialData.poids_kg);

      reset({
        fumeur: initialData.fumeur ?? false,
        consomme_alcool: initialData.consomme_alcool ?? false,
        pratique_sport: initialData.pratique_sport ?? false,
        a_infirmite: initialData.a_infirmite ?? false,
        malade_6_derniers_mois: initialData.malade_6_derniers_mois ?? false,
        souvent_fatigue: initialData.souvent_fatigue ?? false,
        perte_poids_recente: initialData.perte_poids_recente ?? false,
        prise_poids_recente: initialData.prise_poids_recente ?? false,
        a_ganglions: initialData.a_ganglions ?? false,
        fievre_persistante: initialData.fievre_persistante ?? false,
        plaies_buccales: initialData.plaies_buccales ?? false,
        diarrhee_frequente: initialData.diarrhee_frequente ?? false,
        ballonnement: initialData.ballonnement ?? false,
        oedemes_membres_inferieurs: initialData.oedemes_membres_inferieurs ?? false,
        essoufflement: initialData.essoufflement ?? false,
        a_eu_perfusion: initialData.a_eu_perfusion ?? false,
        a_eu_transfusion: initialData.a_eu_transfusion ?? false,
        est_hypertendu: initialData.est_hypertendu ?? false,
        est_diabetique: initialData.est_diabetique ?? false,
        tension_arterielle: initialData.tension_arterielle,
        infos_complementaires: initialData.infos_complementaires,
        nb_cigarettes_jour: safeNumber(initialData.nb_cigarettes_jour),
        type_sport: initialData.type_sport,
        distractions: initialData.distractions,
        taille_cm: taille,
        poids_kg: poids,
        details: initialData.details,
      }, {
        keepDefaultValues: false
      });

      // Log for debugging
      console.log("📋 MedicalForm: Reset with taille=", taille, "poids=", poids);
    }
  }, [isWizardMode, initialData, reset]);



  const taille = watch("taille_cm");
  const poids = watch("poids_kg");
  const fumeur = watch("fumeur");
  const nbCigarettes = watch("nb_cigarettes_jour");
  const alcool = watch("consomme_alcool");
  const questionnaire = watch();

  // Calcul en temps réel du score
  useEffect(() => {
    if (taille && poids) {
      const imc = MedicalScoring.calculateIMC(poids, taille);
      const imcScore = MedicalScoring.getIMCScore(imc);
      const tabacScore = MedicalScoring.getTabacScore(fumeur, nbCigarettes);
      const alcoolScore = MedicalScoring.getAlcoolScore(alcool);
      const antecedentsScore = MedicalScoring.getAntecedentsScore(questionnaire as any);
      const scoreTotal = imcScore + tabacScore + alcoolScore + antecedentsScore;
      const tauxSurprime = MedicalScoring.getTauxSurprime(scoreTotal);
      const categorieRisque = MedicalScoring.getCategorieRisque(scoreTotal);

      setScoreData(prev => {
        if (prev &&
          prev.imc === imc &&
          prev.scoreTotal === scoreTotal &&
          prev.tauxSurprime === tauxSurprime &&
          prev.categorieRisque === categorieRisque) {
          return prev;
        }
        return {
          imc,
          scoreTotal,
          tauxSurprime,
          categorieRisque,
        };
      });
    }
  }, [taille, poids, fumeur, nbCigarettes, alcool, JSON.stringify(questionnaire)]);

  const findExistingQuestionnaire = async (simId: string, simRef: string | null) => {
    try {
      const response = await questionnairesApi.getQuestionnaires(simId, simRef || undefined);
      if (response && response.length > 0) {
        const quest = response[0];
        // Fetch details if available
        try {
          const details = await questionnairesApi.getQuestionnaireDetails(quest.id);
          // @ts-ignore
          quest.fetchedDetails = details;
        } catch (e) { console.error("Could not fetch details", e); }
        return quest;
      }
    } catch (e) { console.error("Erreur recherche par endpoint nesté", e); }
    return null;
  };



  const onSubmitDetails = async (questionnaireId: number, formData: QuestionnaireFormData) => {
    for (const q of MEDICAL_QUESTIONS) {
      if (formData[q.id as keyof QuestionnaireFormData] === true) {
        const details = formData.details?.[q.id];
        if (details) {
          try {
            // Format period from dates if available
            let periodString = "";
            if (details.date_debut || details.date_fin) {
              const formatDate = (d?: string) => {
                if (!d) return null;
                const date = new Date(d);
                return (!isNaN(date.getTime())) ? date.toLocaleDateString("fr-FR") : null;
              };
              const start = formatDate(details.date_debut);
              const end = formatDate(details.date_fin);

              if (start && end) periodString = `Du ${start} au ${end}`;
              else if (start) periodString = `Depuis le ${start}`;
              else if (end) periodString = `Jusqu'au ${end}`;

              // Set the calculated string back to the object
              details.periode_traitement = periodString;
            }

            const detailPayload = {
              question_label: q.label,
              question_field: q.id,
              precisez: details.precisez,
              periode_traitement: periodString,
              lieu_traitement: details.lieu_traitement,
            };

            const existingDetailId = existingDetailsIds[q.id];

            if (existingDetailId) {
              await questionnairesApi.updateQuestionnaireDetail(questionnaireId, existingDetailId, detailPayload);
            } else {
              await questionnairesApi.addQuestionnaireDetails(questionnaireId, detailPayload);
            }
          } catch (e) {
            console.error(`Erreur ajout/maj détails pour ${q.id}`, e);
            // On continue même si un détail échoue
          }
        }
      }
    }
  };

  const onSubmit = async (data: QuestionnaireFormData) => {
    // 1. Aggregate details into infos_complementaires
    let aggregatedDetails = data.infos_complementaires || "";
    const detailsList: string[] = [];

    MEDICAL_QUESTIONS.forEach((q) => {
      if (data[q.id as keyof QuestionnaireFormData] === true) {
        const detail = data.details?.[q.id];
        if (detail) {
          let periodString = "";
          if (detail.date_debut || detail.date_fin) {
            const formatDate = (d?: string) => {
              if (!d) return null;
              const date = new Date(d);
              return (!isNaN(date.getTime())) ? date.toLocaleDateString("fr-FR") : null;
            };
            const start = formatDate(detail.date_debut);
            const end = formatDate(detail.date_fin);

            if (start && end) periodString = `Du ${start} au ${end}`;
            else if (start) periodString = `Depuis le ${start}`;
            else if (end) periodString = `Jusqu'au ${end}`;

            // Important: update the detail object so it's passed correctly to the wizard
            detail.periode_traitement = periodString;
          }

          detailsList.push(
            `${q.label}: ${detail.precisez} (Période: ${periodString}, Lieu: ${detail.lieu_traitement})`
          );
        }
      }
    });

    if (detailsList.length > 0) {
      if (aggregatedDetails) aggregatedDetails += "\n\n";
      aggregatedDetails += "Détails Médicaux:\n" + detailsList.join("\n");
    }

    // 2. Prepare the base payload
    const questionnaireData: QuestionnaireFormData = {
      ...data,
      infos_complementaires: aggregatedDetails,
      taille_cm: Number(data.taille_cm), // Ensure number
      poids_kg: Number(data.poids_kg),   // Ensure number
      nb_cigarettes_jour: data.fumeur ? data.nb_cigarettes_jour : undefined,
    };

    // 3. Wizard Mode Handling
    if (isWizardMode && onWizardSubmit) {
      setIsSubmitting(true);
      try {
        // Pass the full data (including details) to the wizard handler.
        // The wizard handler (SimulationForm) needs to handle stripping details for the main API
        // and saving them separately if needed.
        await onWizardSubmit(questionnaireData);
      } catch (error) {
        console.error("Erreur wizard submit:", error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 4. Standalone Mode Handling
    if (!simulationId) return;

    setIsSubmitting(true);

    // Prepare payload for main API (remove details)
    const apiPayload = { ...questionnaireData };
    // @ts-ignore
    delete apiPayload.details;

    try {
      let questionnaireId: number;
      let existing = await findExistingQuestionnaire(simulationId, simulationReference);

      if (existing) {
        await questionnairesApi.updateQuestionnaire(simulationId, existing.id, apiPayload as QuestionnaireMedical);
        questionnaireId = existing.id;
      } else {
        try {
          const created = await questionnairesApi.createQuestionnaire(simulationId, apiPayload as QuestionnaireMedical);
          questionnaireId = created.id;
        } catch (createError: any) {
          const errorData = createError?.response?.data;
          const errorString = JSON.stringify(errorData || {});

          if (createError?.response?.status === 400 &&
            (errorString.includes("existe déjà") || errorString.includes("already exists"))) {

            existing = await findExistingQuestionnaire(simulationId, simulationReference);
            if (existing) {
              await questionnairesApi.updateQuestionnaire(simulationId, existing.id, apiPayload as QuestionnaireMedical);
              questionnaireId = existing.id;
            } else {
              throw new Error("Impossible de récupérer le questionnaire existant.");
            }
          } else {
            throw createError;
          }
        }
      }

      // Submit Details separately
      await onSubmitDetails(questionnaireId, data);

      toast.success("Questionnaire soumis avec succès");
      router.push(`/simulations/${simulationId}`);
    } catch (error: any) {
      console.error("Erreur soumission:", error);
      toast.error(error?.message || "Erreur lors de la soumission");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper component for styled radio toggle
  const YesNoToggle = ({ id, label, value, onChange }: { id: string, label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex-1 cursor-pointer mr-4 leading-relaxed">
        {label}
      </Label>
      <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${value
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Oui
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!value
            ? "bg-white text-slate-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Non
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Données Physiques */}
      <StepCard>
        <StepSectionHeader
          icon={<Ruler className="w-4 h-4" />}
          title="Données Physiques"
          subtitle="Taille, poids et tension artérielle de l'assuré"
          accentColor="blue"
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Taille (cm)</Label>
              <div className="relative">
                <Input
                  type="number"
                  {...register("taille_cm", { valueAsNumber: true })}
                  className="pl-10 h-12 text-lg font-medium"
                  placeholder="175"
                />
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.taille_cm && <p className="text-xs text-red-500 font-medium">{errors.taille_cm.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Poids (kg)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  {...register("poids_kg", { valueAsNumber: true })}
                  className="pl-10 h-12 text-lg font-medium"
                  placeholder="70"
                />
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.poids_kg && <p className="text-xs text-red-500 font-medium">{errors.poids_kg.message}</p>}
            </div>

            {scoreData && (
              <div className="flex flex-col justify-end">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">IMC Calculé</span>
                  <span className={`text-xl font-bold ${getIMCColor(scoreData.imc)}`}>
                    {scoreData.imc.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            <div className="md:col-span-3 pt-2">
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Tension Artérielle</Label>
                <div className="relative">
                  <Input {...register("tension_arterielle")} placeholder="Ex: 12/8" className="pl-10 h-12 text-lg" />
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </StepCard>

      {/* 2. Habitudes de Vie */}
      <StepCard>
        <StepSectionHeader
          icon={<Activity className="w-4 h-4" />}
          title="Habitudes de Vie"
          subtitle="Consommation de tabac, alcool et loisirs"
          accentColor="emerald"
        />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <input type="hidden" {...register("fumeur")} />
              <YesNoToggle
                id="fumeur"
                label="Êtes-vous fumeur ?"
                value={watch("fumeur")}
                onChange={(v) => setValue("fumeur", v, { shouldValidate: true, shouldDirty: true })}
              />
              {watch("fumeur") && (
                <div className="ml-2 pl-4 border-l-2 border-slate-200 animate-in slide-in-from-left-2 duration-300">
                  <Label className="text-xs text-gray-500 mb-1.5 block">Cigarettes / jour</Label>
                  <Input
                    type="number"
                    {...register("nb_cigarettes_jour", { valueAsNumber: true })}
                    className="h-9 w-32"
                  />
                </div>
              )}
            </div>

            <input type="hidden" {...register("consomme_alcool")} />
            <YesNoToggle
              id="consomme_alcool"
              label="Consommez-vous de l'alcool ?"
              value={watch("consomme_alcool")}
              onChange={(v) => setValue("consomme_alcool", v, { shouldValidate: true, shouldDirty: true })}
            />

            <input type="hidden" {...register("pratique_sport")} />
            <YesNoToggle
              id="pratique_sport"
              label="Pratiquez-vous une activité sportive ?"
              value={watch("pratique_sport")}
              onChange={(v) => setValue("pratique_sport", v, { shouldValidate: true, shouldDirty: true })}
            />

            {watch("pratique_sport") && (
              <div className="space-y-1 animate-in fade-in">
                <Label className="text-xs text-gray-500">Type de sport</Label>
                <Input
                  {...register("type_sport")}
                  placeholder="Ex: Course à pied, Natation..."
                  className="h-10"
                />
              </div>
            )}

            <div className="md:col-span-2 mt-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2 block">Loisirs & Distractions</Label>
              <Input {...register("distractions")} placeholder="Ex: Jardinage, Lecture, Voyages..." />
            </div>
          </div>
        </div>
      </StepCard>

      {/* 3. Antécédents Médicaux */}
      <StepCard>
        <StepSectionHeader
          icon={<Heart className="w-4 h-4" />}
          title="Antécédents Médicaux"
          subtitle="Déclarations de santé et pathologies"
          accentColor="rose"
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {MEDICAL_QUESTIONS.map((question) => (
              <div key={question.id} className="space-y-3">
                <input type="hidden" {...register(question.id as keyof QuestionnaireFormData)} />
                <YesNoToggle
                  id={question.id}
                  label={question.label}
                  value={watch(question.id as keyof QuestionnaireFormData) as boolean}
                  onChange={(v) => setValue(question.id as keyof QuestionnaireFormData, v, { shouldValidate: true, shouldDirty: true })}
                />

                {watch(question.id as keyof QuestionnaireFormData) && (
                  <div className="ml-4 pl-4 border-l-2 border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-1 bg-amber-50/50 p-4 rounded-r-lg">
                    <p className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      Détails requis pour: <span className="italic">{question.label}</span>
                    </p>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1">Précisez la maladie / affection</Label>
                      <Input
                        {...register(`details.${question.id}.precisez` as any)}
                        placeholder="Ex: Paludisme grave, facture..."
                        className="bg-white"
                      />
                      {/* @ts-ignore */}
                      {errors.details?.[question.id]?.precisez && <p className="text-xs text-red-500 mt-1">Ce champ est requis</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 mb-1">Période de traitement</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-gray-400 mb-0.5 block">Date début</Label>
                            <DatePickerInput
                              id={`details-${question.id}-date_debut`}
                              value={watch(`details.${question.id}.date_debut` as any)}
                              onChange={(val) => setValue(`details.${question.id}.date_debut` as any, val)}
                              placeholder="Sélectionner"
                              className="text-xs h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-gray-400 mb-0.5 block">Date fin</Label>
                            <DatePickerInput
                              id={`details-${question.id}-date_fin`}
                              value={watch(`details.${question.id}.date_fin` as any)}
                              onChange={(val) => setValue(`details.${question.id}.date_fin` as any, val)}
                              placeholder="Sélectionner"
                              className="text-xs h-9"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Label className="text-xs text-slate-600 mb-1">Lieu de traitement</Label>
                        <Input
                          {...register(`details.${question.id}.lieu_traitement` as any)}
                          placeholder="Ex: Hôpital général..."
                          className="bg-white"
                        />
                        {/* @ts-ignore */}
                        {errors.details?.[question.id]?.lieu_traitement && <p className="text-xs text-red-500 mt-1">Requis</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </StepCard>

      {/* Affichage du score */}
      {
        scoreData && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <RiskScoreDisplay
              scoreTotal={scoreData.scoreTotal}
              tauxSurprime={scoreData.tauxSurprime}
              categorieRisque={scoreData.categorieRisque}
            />
          </div>
        )
      }

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <Button
          type="button"
          variant="ghost"
          className="text-gray-500 hover:text-gray-800"
          onClick={() => router.push(`/simulations/${simulationId}`)}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] shadow-lg shadow-blue-200"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            isWizardMode ? (
              <>
                Suivant <ArrowRight className="ml-2 w-4 h-4" />
              </>
            ) : (
              <>
                Enregistrer le Questionnaire
              </>
            )
          )}
        </Button>
      </div>
    </form >
  );
}

// Helper to colorize IMC
function getIMCColor(imc: number) {
  if (imc < 18.5) return "text-amber-500";
  if (imc < 25) return "text-emerald-500";
  if (imc < 30) return "text-amber-600";
  return "text-red-600";
}
