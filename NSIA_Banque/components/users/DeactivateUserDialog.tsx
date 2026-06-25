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
import { UserX } from "lucide-react";

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName?: string;
  isLoading?: boolean;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
  isLoading = false,
}: DeactivateUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <UserX className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                Désactiver l&apos;utilisateur
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {userName ? (
              <>
                Êtes-vous sûr de vouloir désactiver l&apos;utilisateur{" "}
                <span className="font-semibold text-gray-900">{userName}</span> ?
                L&apos;utilisateur ne pourra plus se connecter au système jusqu&apos;à
                ce qu&apos;il soit réactivé.
              </>
            ) : (
              <>
                Êtes-vous sûr de vouloir désactiver cet utilisateur ? L&apos;utilisateur
                ne pourra plus se connecter au système jusqu&apos;à ce qu&apos;il soit
                réactivé.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
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
                Désactivation...
              </span>
            ) : (
              "Désactiver"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}




