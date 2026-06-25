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
import { useAgenceStore } from "@/lib/store/agenceStore";
import { Loader2 } from "lucide-react";
import type { Agence } from "@/types";

interface DeleteAgenceDialogProps {
    agence: Agence | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteAgenceDialog({ agence, open, onOpenChange }: DeleteAgenceDialogProps) {
    const { deleteAgence, isLoading } = useAgenceStore();

    const onDelete = async () => {
        if (!agence) return;
        try {
            await deleteAgence(agence.id);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer l'agence</AlertDialogTitle>
                    <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer l'agence <span className="font-semibold">{agence?.nom}</span> ?
                        Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete();
                        }}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
