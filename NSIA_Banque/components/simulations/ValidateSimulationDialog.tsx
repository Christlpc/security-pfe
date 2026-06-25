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
import { CheckCircle } from "lucide-react";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { useProductLabels } from "@/lib/hooks/useProductLabels";

interface ValidateSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  simulation?: SimulationResponse;
  isLoading?: boolean;
}

export function ValidateSimulationDialog({
  open,
  onOpenChange,
  onConfirm,
  simulation,
  isLoading = false,
}: ValidateSimulationDialogProps) {
  const { getLabel } = useProductLabels();
  // Safe access to client name as it might vary by product schema
  const sim = simulation as any;
  const simulationName = simulation
    ? `${sim.prenom_client || ''} ${sim.nom_client || ''} - ${getLabel(simulation.produit)}`
    : undefined;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                Valider la simulation
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {simulationName ? (
              <>
                Êtes-vous sûr de vouloir valider la simulation{" "}
                <span className="font-semibold text-gray-900">{simulationName}</span> ?
                Une fois validée, la simulation pourra être convertie en contrat et
                l&apos;export BIA sera disponible.
              </>
            ) : (
              <>
                Êtes-vous sûr de vouloir valider cette simulation ? Une fois validée,
                la simulation pourra être convertie en contrat et l&apos;export BIA sera
                disponible.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
          >
            {isLoading ? (
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
                Validation...
              </span>
            ) : (
              "Valider"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}




