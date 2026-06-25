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
import { Trash2 } from "lucide-react";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { useProductLabels } from "@/lib/hooks/useProductLabels";

interface DeleteSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  simulation?: SimulationResponse;
  isLoading?: boolean;
}

export function DeleteSimulationDialog({
  open,
  onOpenChange,
  onConfirm,
  simulation,
  isLoading = false,
}: DeleteSimulationDialogProps) {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                Supprimer la simulation
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {simulationName ? (
              <>
                Êtes-vous sûr de vouloir supprimer la simulation{" "}
                <span className="font-semibold text-gray-900">{simulationName}</span> ?
                Cette action est irréversible et toutes les données associées seront
                définitivement supprimées.
              </>
            ) : (
              <>
                Êtes-vous sûr de vouloir supprimer cette simulation ? Cette action est
                irréversible et toutes les données associées seront définitivement
                supprimées.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
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
                Suppression...
              </span>
            ) : (
              "Supprimer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}




