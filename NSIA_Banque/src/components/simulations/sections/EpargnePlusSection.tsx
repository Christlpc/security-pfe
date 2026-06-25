import React, { useEffect } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';

interface EpargnePlusSectionProps {
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
}

// Helper for number formatting
const formatNumberWithSpaces = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('fr-FR');
};

const parseFormattedNumber = (value: string): number => {
    const cleaned = value.replace(/\s/g, '').replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

export const EpargnePlusSection: React.FC<EpargnePlusSectionProps> = ({ register, setValue, watch, errors }) => {
    // Register fields handled by custom components
    useEffect(() => {
        register("deja_souscrit_nsia");
        register("periodicite");
        register("mode_paiement");
        register("origine_fonds");
        register("date_effet");
        register("date_premiere_cotisation");
        register("avec_details");
        register("contrats_nsia_existants");
    }, [register]);

    return (
        <div className="space-y-6">
            {/* Section 1: Informations du Contrat */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                    Informations du Contrat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="numero_convention">Numéro Convention</Label>
                        <Input id="numero_convention" value={watch("numero_convention") || ""} readOnly className="bg-gray-50 text-gray-600 cursor-not-allowed" tabIndex={-1} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cotisation_mensuelle">Cotisation Mensuelle (FCFA) *</Label>
                        <Input
                            id="cotisation_mensuelle"
                            type="text"
                            placeholder="Ex: 10 000"
                            value={formatNumberWithSpaces(watch("cotisation_mensuelle"))}
                            onChange={(e) => setValue("cotisation_mensuelle", parseFormattedNumber(e.target.value), { shouldValidate: true, shouldDirty: true })}
                        />
                        {errors.cotisation_mensuelle && <p className="text-xs text-red-500">{String(errors.cotisation_mensuelle.message)}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="duree_annees">Durée (ans) *</Label>
                        <Input
                            id="duree_annees"
                            type="number"
                            min={1}
                            max={30}
                            value={watch("duree_annees") || ""}
                            onChange={(e) => setValue("duree_annees", parseInt(e.target.value) || 0, { shouldValidate: true, shouldDirty: true })}
                        />
                        {errors.duree_annees && <p className="text-xs text-red-500">{String(errors.duree_annees.message)}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="numero_compte_cle">N° Compte Clé *</Label>
                        <Input
                            id="numero_compte_cle"
                            placeholder="Ex: 06"
                            value={watch("numero_compte_cle") || ""}
                            onChange={(e) => setValue("numero_compte_cle", e.target.value, { shouldValidate: true, shouldDirty: true })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="age_epargne">Âge (calculé)</Label>
                        <Input
                            id="age_epargne"
                            type="number"
                            value={watch("age") || ""}
                            readOnly
                            className="bg-gray-100 cursor-not-allowed"
                        />
                    </div>
                    <div className="flex items-end pb-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="avec_details"
                                checked={watch("avec_details") || false}
                                onCheckedChange={(checked) => setValue("avec_details", checked as boolean)}
                            />
                            <label
                                htmlFor="avec_details"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Voir le détail mensuel
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Antécédents NSIA */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs">2</span>
                    Antécédents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="deja_souscrit_nsia">Avez-vous déjà souscrit à NSIA ? *</Label>
                        <Select
                            onValueChange={(v) => setValue("deja_souscrit_nsia", v === "oui", { shouldValidate: true, shouldDirty: true })}
                            value={watch("deja_souscrit_nsia") ? "oui" : "non"}
                        >
                            <SelectTrigger id="deja_souscrit_nsia">
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="oui">Oui</SelectItem>
                                <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {watch("deja_souscrit_nsia") && (
                        <div className="space-y-2">
                            <Label htmlFor="contrats_nsia_existants">Liste des contrats existants</Label>
                            <Input
                                id="contrats_nsia_existants"
                                value={watch("contrats_nsia_existants") || ""}
                                onChange={(e) => setValue("contrats_nsia_existants", e.target.value, { shouldValidate: true, shouldDirty: true })}
                                placeholder="Ex: Elikia Scolaire"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Section 3: Dates Importantes */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">3</span>
                    Dates Importantes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date_effet">Date d'Effet *</Label>
                        <DatePickerInput
                            id="date_effet"
                            value={watch("date_effet") as string}
                            onChange={(date) => setValue("date_effet", date, { shouldValidate: true, shouldDirty: true })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date_premiere_cotisation">Date Première Cotisation *</Label>
                        <DatePickerInput
                            id="date_premiere_cotisation"
                            value={watch("date_premiere_cotisation") as string}
                            onChange={(date) => setValue("date_premiere_cotisation", date, { shouldValidate: true, shouldDirty: true })}
                        />
                    </div>
                </div>
            </div>



            {/* Section 4: Modalités de Paiement */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">4</span>
                    Modalités de Paiement
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="periodicite">Périodicité *</Label>
                        <Select
                            onValueChange={(v) => setValue("periodicite", v, { shouldValidate: true, shouldDirty: true })}
                            value={(watch("periodicite") as string) || "M"}
                        >
                            <SelectTrigger id="periodicite">
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="M">Mensuelle</SelectItem>
                                <SelectItem value="T">Trimestrielle</SelectItem>
                                <SelectItem value="S">Semestrielle</SelectItem>
                                <SelectItem value="A">Annuelle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mode_paiement">Mode de Paiement *</Label>
                        <Select
                            onValueChange={(v) => setValue("mode_paiement", v, { shouldValidate: true, shouldDirty: true })}
                            value={(watch("mode_paiement") as string) || ""}
                        >
                            <SelectTrigger id="mode_paiement"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="especes">Espèces</SelectItem>
                                <SelectItem value="virement">Virement</SelectItem>
                                <SelectItem value="cheque">Chèque</SelectItem>
                                <SelectItem value="prelevement_bancaire">Prélèvement Bancaire</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="origine_fonds">Origine des Fonds *</Label>
                        <Select
                            onValueChange={(v) => setValue("origine_fonds", v, { shouldValidate: true, shouldDirty: true })}
                            value={(watch("origine_fonds") as string) || ""}
                        >
                            <SelectTrigger id="origine_fonds"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="salaire">Salaire</SelectItem>
                                <SelectItem value="revenu_commercial">Revenu Commercial</SelectItem>
                                <SelectItem value="epargne">Epargne</SelectItem>
                                <SelectItem value="heritage">Héritage</SelectItem>
                                <SelectItem value="don">Don</SelectItem>
                                <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
};
