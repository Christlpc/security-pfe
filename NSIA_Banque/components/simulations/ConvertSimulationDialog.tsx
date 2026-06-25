"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Loader2 } from "lucide-react";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { useAuthStore } from "@/lib/store/authStore";
import { formatDateShort } from "@/lib/utils/date";
import type { SouscriptionPayload } from "@/lib/api/simulations/historique";

interface ConvertSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: SouscriptionPayload) => void;
  simulation?: SimulationResponse;
  isLoading?: boolean;
}

export function ConvertSimulationDialog({
  open,
  onOpenChange,
  onConfirm,
  simulation,
  isLoading = false,
}: ConvertSimulationDialogProps) {
  const { user } = useAuthStore();
  const { getLabel } = useProductLabels();

  const handleConfirm = () => {
    if (!simulation) return;

    // Construire le payload automatiquement depuis les données de la simulation
    // Tous les champs NOT NULL selon le DDL doivent avoir des valeurs
    const sim = simulation as any;
    const payload: SouscriptionPayload = {
      simulation: simulation.id,
      banque: user?.banque?.id?.toString(),
      gestionnaire: user?.id?.toString(),
      statut: "en_attente", // Statut initial pour nouvelle souscription
      // Données client récupérées de la simulation (champs NOT NULL)
      nom: sim.nom_client || sim.donnees_entree?.nom || "Non renseigné",
      prenom: sim.prenom_client || sim.donnees_entree?.prenom || "Non renseigné",
      date_naissance: sim.date_naissance || sim.donnees_entree?.date_naissance || "1990-01-01",
      lieu_naissance: sim.donnees_entree?.lieu_naissance || "Non renseigné",
      email: sim.email_client || sim.donnees_entree?.email || "non.renseigne@email.com",
      telephone: sim.telephone_client || sim.donnees_entree?.telephone || "000000000",
      adresse: sim.adresse_postale || sim.donnees_entree?.adresse || "Non renseignée",
      profession: sim.profession || sim.donnees_entree?.profession || "Non renseignée",
      employeur: sim.employeur || sim.donnees_entree?.employeur || "Non renseigné",
      numero_compte: sim.numero_compte || sim.donnees_entree?.numero_compte || "0000000000",
      // Documents en format JSON comme attendu par le DDL (jsonb)
      documents: JSON.stringify([{ type: "passeport", statut: "en_attente" }]),
      // Dates du contrat
      date_effet_contrat: sim.date_effet || sim.donnees_entree?.date_effet || new Date().toISOString().split("T")[0],
      date_echeance_contrat: "",
      // Prime (numeric NOT NULL)
      montant_prime: sim.prime_totale?.toString()
        || sim.resultats_calcul?.prime_totale?.toString()
        || "0",
      // Données produit (jsonb NOT NULL)
      donnees_produit: sim.donnees_entree || {},
      date_validation: new Date().toISOString(),
      notes: "",
      commentaires: "",
    };

    onConfirm(payload);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                Convertir en souscription
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            Êtes-vous sûr de vouloir convertir cette simulation en souscription ?
            Toutes les informations seront automatiquement récupérées.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {simulation && (
          <div className="py-4 space-y-3 text-sm bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Référence :</span>
              <span className="font-medium">{simulation.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Client :</span>
              <span className="font-medium">
                {(simulation as any).prenom_client || (simulation as any).donnees_entree?.prenom} {(simulation as any).nom_client || (simulation as any).donnees_entree?.nom}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Produit :</span>
              <span className="font-medium">
                {getLabel(simulation.produit) || simulation.produit}
              </span>
            </div>
            {((simulation as any).date_naissance || (simulation as any).donnees_entree?.date_naissance) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Date de naissance :</span>
                <span className="font-medium">
                  {formatDateShort((simulation as any).date_naissance || (simulation as any).donnees_entree?.date_naissance)}
                </span>
              </div>
            )}
            {((simulation as any).telephone_client || (simulation as any).donnees_entree?.telephone) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Téléphone :</span>
                <span className="font-medium">
                  {(simulation as any).telephone_client || (simulation as any).donnees_entree?.telephone}
                </span>
              </div>
            )}
            {((simulation as any).prime_totale || simulation.resultats_calcul?.prime_totale) && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-600 font-medium">Prime totale :</span>
                <span className="font-bold text-green-600">
                  {((simulation as any).prime_totale || simulation.resultats_calcul?.prime_totale)?.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conversion...
              </>
            ) : (
              "Convertir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
