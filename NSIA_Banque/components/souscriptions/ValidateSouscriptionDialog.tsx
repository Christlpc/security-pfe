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
import type { Souscription } from "@/lib/api/simulations";

interface ValidateSouscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  souscription: Souscription;
  onValidate: (id: string) => Promise<void>;
}

export function ValidateSouscriptionDialog({
  open,
  onOpenChange,
  souscription,
  onValidate,
}: ValidateSouscriptionDialogProps) {
  const handleValidate = async () => {
    await onValidate(souscription.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Valider la souscription</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir valider la souscription de{" "}
            <strong>
              {souscription.prenom} {souscription.nom}
            </strong>
            ?
            <br />
            <br />
            Cette action confirmera la souscription et créera le contrat d'assurance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleValidate}>Valider</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

