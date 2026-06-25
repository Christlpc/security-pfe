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
import { useBanqueStore } from "@/lib/store/banqueStore";
import type { Banque } from "@/types";
import { AlertTriangle } from "lucide-react";

interface DeleteBanqueDialogProps {
    banque: Banque;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteBanqueDialog({ banque, open, onOpenChange }: DeleteBanqueDialogProps) {
    const { deleteBanque, isLoading } = useBanqueStore();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteBanque(banque.id);
            onOpenChange(false);
        } catch (error) {
            // L'erreur est gérée par le store
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <AlertDialogTitle>Supprimer la banque</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="mt-3">
                        Êtes-vous sûr de vouloir supprimer la banque <strong className="text-gray-900">{banque.nom}</strong> ?
                        <br />
                        <br />
                        <span className="text-red-600 font-medium">
                            Cette action est irréversible et supprimera toutes les données associées à cette banque.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting || isLoading}>
                        Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting || isLoading}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {isDeleting ? (
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
