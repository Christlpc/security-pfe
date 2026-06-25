"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Souscription } from "@/lib/api/simulations";

interface RejectSouscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  souscription: Souscription;
  onReject: (id: string, raison: string) => Promise<void>;
}

export function RejectSouscriptionDialog({
  open,
  onOpenChange,
  souscription,
  onReject,
}: RejectSouscriptionDialogProps) {
  const [raison, setRaison] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    const motifRejet = raison.trim();
    if (!motifRejet) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(souscription.id, motifRejet);
      setRaison("");
      onOpenChange(false);
    } catch (error) {
      // L'erreur est gérée dans le parent, on ne fait rien ici
      console.error("Erreur rejet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset raison when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRaison("");
    }
    onOpenChange(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeter la souscription</AlertDialogTitle>
          <AlertDialogDescription>
            Vous êtes sur le point de rejeter la souscription de{" "}
            <strong>
              {souscription.prenom} {souscription.nom}
            </strong>
            .
            <br />
            <br />
            Veuillez indiquer la raison du rejet :
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="raison">Raison du rejet *</Label>
            <Textarea
              id="raison"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="Expliquez la raison du rejet..."
              className="mt-2"
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setRaison("")} disabled={isSubmitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={!raison.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "Rejet en cours..." : "Rejeter"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

