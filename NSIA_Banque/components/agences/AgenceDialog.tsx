"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAgenceStore } from "@/lib/store/agenceStore";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { useAuthStore } from "@/lib/store/authStore";
import { Loader2 } from "lucide-react";
import { isAdmin } from "@/lib/utils/permissions";
import type { Agence } from "@/types";

const agenceSchema = z.object({
    banque: z.string().min(1, "La banque est requise"),
    code: z.string().min(1, "Le code est requis"),
    nom: z.string().min(1, "Le nom est requis"),
    ville: z.string().min(1, "La ville est requise"),
    adresse: z.string().min(1, "L'adresse est requise"),
    telephone: z.string().min(1, "Le téléphone est requis"),
    email: z.string().email("Email invalide"),
    active: z.boolean().default(true),
});

type AgenceFormData = z.infer<typeof agenceSchema>;

interface AgenceDialogProps {
    agence?: Agence | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AgenceDialog({ agence, open, onOpenChange }: AgenceDialogProps) {
    const { createAgence, updateAgence, isLoading } = useAgenceStore();
    const { banques, fetchBanques } = useBanqueStore();
    const { user: currentUser } = useAuthStore();
    const isEditing = !!agence;

    // Admin users should always see bank selection, non-admins only see it if they don't have a fixed bank
    const showBankSelection = isAdmin(currentUser?.role) || !currentUser?.banque;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<AgenceFormData>({
        resolver: zodResolver(agenceSchema),
        defaultValues: {
            banque: "",
            code: "",
            nom: "",
            ville: "",
            adresse: "",
            telephone: "",
            email: "",
            active: true,
        },
    });

    useEffect(() => {
        if (open) {
            // Always fetch banks if bank selection is visible
            if (showBankSelection) {
                fetchBanques();
            }

            if (agence) {
                reset({
                    banque: agence.banque,
                    code: agence.code,
                    nom: agence.nom,
                    ville: agence.ville,
                    adresse: agence.adresse,
                    telephone: agence.telephone,
                    email: agence.email,
                    active: agence.active,
                });
            } else {
                reset({
                    banque: showBankSelection ? "" : String(currentUser?.banque?.id || ""),
                    code: "",
                    nom: "",
                    ville: "",
                    adresse: "",
                    telephone: "",
                    email: "",
                    active: true,
                });
            }
        }
    }, [open, agence, reset, fetchBanques, showBankSelection, currentUser]);

    const onSubmit = async (data: AgenceFormData) => {
        try {
            if (isEditing && agence) {
                await updateAgence(agence.id, data);
            } else {
                await createAgence(data);
            }
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Modifier l'agence" : "Nouvelle agence"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-6 px-6">

                    <div className="grid grid-cols-2 gap-6">
                        {showBankSelection && (
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="banque">Banque *</Label>
                                <Select
                                    onValueChange={(value) => setValue("banque", value)}
                                    value={watch("banque")}
                                >
                                    <SelectTrigger id="banque" className={errors.banque ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Sélectionner une banque" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banques.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.banque && <p className="text-xs text-red-500">{errors.banque.message}</p>}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="code">Code</Label>
                            <Input id="code" {...register("code")} className={errors.code ? "border-red-500" : ""} placeholder="AG001" />
                            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nom">Nom</Label>
                            <Input id="nom" {...register("nom")} className={errors.nom ? "border-red-500" : ""} placeholder="Agence Principale" />
                            {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ville">Ville</Label>
                            <Input id="ville" {...register("ville")} className={errors.ville ? "border-red-500" : ""} placeholder="Brazzaville" />
                            {errors.ville && <p className="text-xs text-red-500">{errors.ville.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="telephone">Téléphone</Label>
                            <Input id="telephone" {...register("telephone")} className={errors.telephone ? "border-red-500" : ""} placeholder="+242..." />
                            {errors.telephone && <p className="text-xs text-red-500">{errors.telephone.message}</p>}
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} className={errors.email ? "border-red-500" : ""} placeholder="agence@banque.com" />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="adresse">Adresse</Label>
                            <Input id="adresse" {...register("adresse")} className={errors.adresse ? "border-red-500" : ""} placeholder="Adresse complète" />
                            {errors.adresse && <p className="text-xs text-red-500">{errors.adresse.message}</p>}
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="active"
                                checked={watch("active")}
                                onCheckedChange={(checked) => setValue("active", checked as boolean)}
                            />
                            <Label htmlFor="active" className="cursor-pointer">Agence active</Label>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
