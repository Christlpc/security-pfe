"use client";

import { useState } from "react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useAuthStore } from "@/lib/store/authStore";
import { ROLES, API_BASE_URL } from "@/lib/utils/constants";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { FileText, CheckCircle, Download, MoreVertical, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { DeleteSimulationDialog } from "./DeleteSimulationDialog";
import { ValidateSimulationDialog } from "./ValidateSimulationDialog";
import { ConvertSimulationDialog } from "./ConvertSimulationDialog";

interface SimulationActionsProps {
  simulation: SimulationResponse;
}

import { questionnairesApi, exportsApi } from "@/lib/api/simulations";

export function SimulationActions({ simulation }: SimulationActionsProps) {
  const router = useSafeRouter();
  const { user } = useAuthStore();
  const { deleteSimulation, validateSimulation, convertSimulation } =
    useSimulationStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const handleValidateClick = () => {
    setValidateDialogOpen(true);
  };

  const handleValidateConfirm = async () => {
    setIsValidating(true);
    try {
      await validateSimulation(simulation.id);
      setValidateDialogOpen(false);
      // Toast is handled by the store
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la validation");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConvertClick = () => {
    setConvertDialogOpen(true);
  };

  const handleConvertConfirm = async (data: any) => {
    setIsConverting(true);
    try {
      // Le dialogue de conversion collecte maintenant toutes les données nécessaires
      // et les passe directement via le paramètre data
      await convertSimulation(simulation.id, data);
      setConvertDialogOpen(false);
      // Toast is handled by the store
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message
        || "Erreur lors de la conversion";
      toast.error(errorMsg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteSimulation(simulation.id);
      setDeleteDialogOpen(false);
      // Toast is handled by the store
      router.push("/simulations");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportBIA = () => {
    router.push(`/simulations/${simulation.id}/export`);
  };

  // Permettre la modification pour brouillon, calculee, validee, et proposition
  // Seules les simulations converties sont bloquées
  const canEdit = simulation.statut !== "convertie";
  // Note: Le calcul de prime se fait automatiquement lors de la création via produitsApi
  // Le bouton "Calculer" est supprimé car l'endpoint n'existe pas dans l'API réelle
  const canValidate =
    (simulation.statut === "calculee" || simulation.statut === "brouillon");
  // (user?.role === ROLES.RESPONSABLE_BANQUE ||
  //   user?.role === ROLES.ADMIN_NSIA ||
  //   user?.role === ROLES.SUPER_ADMIN_NSIA);
  const canConvert = simulation.statut === "validee";
  const canExport = simulation.statut === "validee" || simulation.statut === "convertie";
  const canDelete = simulation.statut !== "convertie" && user?.role !== ROLES.GESTIONNAIRE;

  return (
    <div className="flex items-center gap-2">
      {/* Bouton "Calculer" supprimé : le calcul se fait automatiquement lors de la création */}

      {canValidate && (
        <Button variant="outline" onClick={handleValidateClick}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Valider
        </Button>
      )}

      {canConvert && (
        <Button variant="outline" onClick={handleConvertClick}>
          <FileText className="mr-2 h-4 w-4" />
          Convertir
        </Button>
      )}

      {canExport && (
        <Button variant="outline" onClick={handleExportBIA}>
          <Download className="mr-2 h-4 w-4" />
          Exporter BIA
        </Button>
      )}

      {/* Boutons pour le statut "calculee" */}
      {simulation.statut === "calculee" && (
        <>
          <Button
            variant="outline"
            onClick={() => router.push(`/simulations/${simulation.id}/questionnaire`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Questionnaire
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const url = await exportsApi.previewBIA(simulation.id);
                window.open(url, '_blank');
              } catch (e) {
                toast.error("Erreur lors de l'ouverture du BIA");
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Voir BIA
          </Button>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={() => router.push(`/simulations/${simulation.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
          )}
          {/* Questionnaire déplacé en bouton principal
          {simulation.statut === "calculee" && (
            <DropdownMenuItem
              onClick={() => router.push(`/simulations/${simulation.id}/questionnaire`)}
            >
              Questionnaire médical
            </DropdownMenuItem>
          )}
          */}
          <DropdownMenuSeparator />
          {canDelete && (
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <DeleteSimulationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        simulation={simulation}
        isLoading={isDeleting}
      />

      <ValidateSimulationDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        onConfirm={handleValidateConfirm}
        simulation={simulation}
        isLoading={isValidating}
      />

      <ConvertSimulationDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onConfirm={handleConvertConfirm}
        simulation={simulation}
        isLoading={isConverting}
      />
    </div>
  );
}

