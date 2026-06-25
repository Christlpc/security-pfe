"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { SimulationForm } from "@/components/simulations/SimulationForm";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { questionnairesApi } from "@/lib/api/simulations";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function EditSimulationPage() {
    const params = useParams();
    const router = useSafeRouter();
    const id = params.id as string;
    const { fetchSimulation, currentSimulation, isLoading } = useSimulationStore();

    // Track if we've already initialized and if wizard data is ready
    const hasInitialized = useRef(false);
    const [isWizardReady, setIsWizardReady] = useState(false);

    useEffect(() => {
        // Prevent multiple initializations
        if (!id || hasInitialized.current) return;

        const loadSimulation = async () => {
            hasInitialized.current = true;
            setIsWizardReady(false);

            // Reset wizard before loading new simulation data
            useSimulationStore.getState().resetWizard();

            try {
                await fetchSimulation(id);

                // Une fois chargé, on initialise le wizard
                const sim = useSimulationStore.getState().currentSimulation;
                console.log("📥 Loaded simulation for edit:", sim);
                console.log("📥 donnees_entree:", sim?.donnees_entree);
                console.log("📥 resultats_calcul:", sim?.resultats_calcul);

                if (sim) {
                    // Vérifier si la simulation est modifiable (seules les simulations converties sont bloquées)
                    if (sim.statut === "convertie") {
                        toast.error("Cette simulation est déjà convertie en souscription et ne peut plus être modifiée.");
                        router.push(`/simulations/${id}`);
                        return;
                    }

                    const donnees = sim.donnees_entree || {};
                    const resultats = sim.resultats_calcul || {};

                    // Map API fields to form fields - comprehensive mapping
                    const formData = {
                        // === Client info fields ===
                        nom: sim.nom_client || donnees.nom,
                        prenom: sim.prenom_client || donnees.prenom,
                        email: sim.email_client || donnees.email,
                        telephone: sim.telephone_client || donnees.telephone,
                        adresse: sim.adresse_postale || donnees.adresse_postale || donnees.adresse,
                        profession: sim.profession || donnees.profession,
                        employeur: sim.employeur || donnees.employeur,
                        numero_compte: sim.numero_compte || donnees.numero_compte || (sim as any).numero_compte_client || (resultats as any)?.numero_compte,
                        situation_matrimoniale: sim.situation_matrimoniale || donnees.situation_matrimoniale,
                        date_naissance: sim.date_naissance || donnees.date_naissance,

                        // Additional client fields - ensure all are captured
                        titre_assure: (() => {
                            const val = ((sim as any).titre_assure || donnees.titre_assure || "");
                            const clean = String(val).replace(/[^a-zA-Zà-ÿÀ-Ÿ]/g, '').toLowerCase();
                            if (clean.includes('mademoiselle') || clean === 'mlle') return 'Mademoiselle';
                            if (clean.includes('madame') || clean === 'mme') return 'Madame';
                            return 'Monsieur';
                        })(),
                        lieu_naissance: (sim as any).lieu_naissance || donnees.lieu_naissance,

                        // === Common fields ===
                        taux_surprime: sim.taux_surprime || donnees.taux_surprime,
                        date_effet: sim.date_effet || donnees.date_effet,
                        periodicite: donnees.periodicite || sim.periodicite || (resultats as any)?.periodicite,
                        mode_paiement: donnees.mode_paiement || (resultats as any)?.mode_paiement,
                        origine_fonds: donnees.origine_fonds || (resultats as any)?.origine_fonds,

                        // === Emprunteur fields ===
                        montant_pret: sim.montant_pret || donnees.montant_pret,
                        duree_mois: sim.duree_mois || donnees.duree_mois,
                        taux_interet: sim.taux_interet || donnees.taux_interet,
                        numero_convention: donnees.numero_convention,
                        type_pret: donnees.type_pret,
                        date_octroi: donnees.date_octroi,
                        date_premiere_echeance: sim.date_premiere_echeance || donnees.date_premiere_echeance,

                        // === Elikia Scolaire fields ===
                        rente_annuelle: sim.rente_annuelle || donnees.rente_annuelle,
                        age_parent: sim.age_parent || donnees.age_parent,
                        duree_rente: sim.duree_rente || donnees.duree_rente || 5,
                        duree_engagement: donnees.duree_engagement,
                        date_signature: donnees.date_signature,
                        date_fin: donnees.date_fin,
                        dates_renouvellement: donnees.dates_renouvellement,

                        // === Mobateli fields ===
                        capital_dtc_iad: sim.capital_dtc_iad || donnees.capital_dtc_iad,
                        age: sim.age || donnees.age,
                        montant_frais_funeraires: donnees.montant_frais_funeraires,

                        // === Confort Etudes fields ===
                        age_enfant: sim.age_enfant || donnees.age_enfant,
                        montant_rente: sim.montant_rente_annuel || donnees.montant_rente,
                        duree_paiement: sim.duree_paiement || donnees.duree_paiement,
                        duree_service: sim.duree_service || donnees.duree_service,

                        // === Confort Retraite fields ===
                        prime_periodique_commerciale: sim.prime_periodique_commerciale || donnees.prime_periodique_commerciale,
                        capital_deces: sim.capital_deces || donnees.capital_deces,
                        duree: sim.duree || donnees.duree,
                        date_premiere_cotisation: sim.date_premiere_echeance || donnees.date_premiere_cotisation,

                        // === Epargne Plus fields ===
                        cotisation_mensuelle: donnees.cotisation_mensuelle || (resultats as any)?.cotisation_mensuelle,
                        duree_annees: donnees.duree_annees || (resultats as any)?.duree_annees || donnees.duree,
                        numero_compte_cle: donnees.numero_compte_cle || (resultats as any)?.numero_compte_cle,
                        deja_souscrit_nsia: donnees.deja_souscrit_nsia ?? false,
                        contrats_nsia_existants: donnees.contrats_nsia_existants,

                        // === Product type (ensure it's set) ===
                        produit: sim.produit,

                        // === Include reference for display ===
                        reference: sim.reference,

                        // === Preserve resultats_calcul for display in Step 3 ===
                        resultats_calcul: sim.resultats_calcul,
                    };

                    // Map beneficiaries if present
                    const beneficiaires = sim.beneficiaires
                        ?.filter((ben: { qualite?: string }) => ben.qualite !== 'assure') // Exclure l'assuré de la liste des bénéficiaires
                        ?.map((ben: { qualite?: string; nom_prenoms?: string; part_pourcentage?: string | number; ordre?: number }, index: number) => ({
                            qualite: ben.qualite as "conjoint" | "enfant" | "parent" | "autre" | "organisme_pret" | "assure" | "enfant_a_naitre",
                            nom_prenoms: ben.nom_prenoms,
                            part_pourcentage: typeof ben.part_pourcentage === 'string' ? parseFloat(ben.part_pourcentage) : ben.part_pourcentage,
                            ordre: ben.ordre || index + 1,
                        })) || [];

                    console.log("🔄 Mapped form data:", formData);
                    console.log("👥 Mapped beneficiaires:", beneficiaires);

                    // Try to load existing medical questionnaire
                    let questionnaireData = null;
                    try {
                        const questionnaires = await questionnairesApi.getQuestionnaires(sim.id, sim.reference);
                        if (questionnaires && questionnaires.length > 0) {
                            questionnaireData = questionnaires[0];
                            console.log("📋 Loaded questionnaire médical:", questionnaireData);
                        }
                    } catch (qError) {
                        console.log("ℹ️ Pas de questionnaire médical existant (ou erreur de chargement):", qError);
                    }

                    // Update wizard data and mark as ready
                    useSimulationStore.getState().updateWizardData({
                        createdSimulationId: sim.id,
                        simulationData: formData,
                        beneficiaires: beneficiaires,
                        questionnaireData: questionnaireData,
                    });

                    // On commence à l'étape 1 pour permettre de tout modifier
                    useSimulationStore.getState().setWizardStep(1);

                    // Mark wizard as ready - this will trigger form render
                    setIsWizardReady(true);
                }
            } catch (error: any) {
                console.error("Erreur lors du chargement de la simulation:", error);
                if (error.response) {
                    console.error("Response data:", error.response.data);
                }
                toast.error("Erreur lors du chargement de la simulation");
                hasInitialized.current = false; // Allow retry on error
            }
        };

        loadSimulation();
    }, [id, fetchSimulation, router]);

    // Show loading until both simulation is loaded AND wizard is ready
    if (isLoading || !currentSimulation || !isWizardReady) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Modifier la Simulation</h1>
                <p className="text-gray-600 mt-2">
                    Modification de la simulation {currentSimulation.reference}
                </p>
            </div>
            <SimulationForm mode="edit" />
        </div>
    );
}
