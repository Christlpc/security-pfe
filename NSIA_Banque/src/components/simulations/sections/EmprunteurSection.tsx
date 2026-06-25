import React from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumberWithSpaces, parseFormattedNumber } from '@/lib/utils/format';
import { Landmark, Calendar, Wallet, FileText, UserCheck } from 'lucide-react';

interface EmprunteurSectionProps {
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
}

export const EmprunteurSection: React.FC<EmprunteurSectionProps> = ({ register, setValue, watch, errors }) => {
    const dejaSouscritNsia = watch("deja_souscrit_nsia");

    return (
        <div className="space-y-6">

            {/* ── SECTION 1 : QUALITÉ DE L'ASSURÉ ──────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        Qualité de l'Assuré
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-gray-500 mb-3">
                        Pour le produit Emprunteur, le souscripteur est la banque. L'assuré est le client emprunteur.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="qualite_assure">Qualité de l'Assuré *</Label>
                            <Select
                                onValueChange={(v) => setValue("qualite_assure", v, { shouldValidate: true })}
                                value={(watch("qualite_assure") as string) || "emprunteur"}
                            >
                                <SelectTrigger id="qualite_assure"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="emprunteur">Emprunteur</SelectItem>
                                    <SelectItem value="co_emprunteur">Co-emprunteur</SelectItem>
                                    <SelectItem value="caution">Caution</SelectItem>
                                    <SelectItem value="autre">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="numero_convention">Numéro de Convention</Label>
                            <Input id="numero_convention" value={watch("numero_convention") || ""} readOnly className="bg-gray-50 text-gray-600 cursor-not-allowed" tabIndex={-1} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 2 : INFORMATIONS DU PRÊT ─────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-indigo-600" />
                        Informations du Prêt
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type_pret">Type de Prêt</Label>
                            <Select
                                onValueChange={(v) => setValue("type_pret", v, { shouldValidate: true, shouldDirty: true })}
                                value={(watch("type_pret") as string) || ""}
                            >
                                <SelectTrigger id="type_pret"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="consommation">Consommation</SelectItem>
                                    <SelectItem value="immobilier">Immobilier</SelectItem>
                                    <SelectItem value="amortissement_standard">Amortissement Standard</SelectItem>
                                    <SelectItem value="in_fine">In Fine</SelectItem>
                                    <SelectItem value="progressif">Progressif</SelectItem>
                                    <SelectItem value="differe">Différé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="montant_pret">Montant du Prêt (FCFA) *</Label>
                            <Input
                                id="montant_pret"
                                type="text"
                                inputMode="numeric"
                                placeholder="Ex: 15 000 000"
                                value={formatNumberWithSpaces(watch("montant_pret"))}
                                onChange={(e) => {
                                    const numValue = parseFormattedNumber(e.target.value);
                                    setValue("montant_pret", numValue, { shouldValidate: true, shouldDirty: true });
                                }}
                            />
                            {errors.montant_pret && <p className="text-xs text-red-500">{String(errors.montant_pret.message)}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_mois">Durée Remboursement (mois) *</Label>
                            <Input
                                id="duree_mois"
                                type="number"
                                placeholder="Ex: 60"
                                value={watch("duree_mois") || ""}
                                onChange={(e) => setValue("duree_mois", parseInt(e.target.value) || 0, { shouldValidate: true, shouldDirty: true })}
                            />
                            {errors.duree_mois && <p className="text-xs text-red-500">{String(errors.duree_mois.message)}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_differe">Durée du Différé (mois)</Label>
                            <Input
                                id="duree_differe"
                                type="number"
                                min={0}
                                placeholder="Ex: 0"
                                value={watch("duree_differe") ?? ""}
                                onChange={(e) => setValue("duree_differe", parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-gray-500">Durée totale = remboursement + différé</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taux_interet">Taux d'Intérêt (%)</Label>
                            <Input
                                id="taux_interet"
                                type="number"
                                step="0.01"
                                placeholder="Ex: 8.5"
                                value={watch("taux_interet") || ""}
                                onChange={(e) => setValue("taux_interet", parseFloat(e.target.value) || 0, { shouldValidate: true, shouldDirty: true })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taux_tps">Taux TPS (%)</Label>
                            <Input
                                id="taux_tps"
                                type="number"
                                step="0.01"
                                placeholder="Ex: 0"
                                value={watch("taux_tps") ?? ""}
                                onChange={(e) => setValue("taux_tps", parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 3 : DATES ────────────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        Dates Importantes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date_octroi">Date de Mise en Place / Octroi</Label>
                            <DatePickerInput
                                id="date_octroi"
                                value={watch("date_octroi")}
                                onChange={(val) => setValue("date_octroi", val, { shouldValidate: true, shouldDirty: true })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_effet">Date d'Effet de la Garantie</Label>
                            <DatePickerInput
                                id="date_effet"
                                value={watch("date_effet")}
                                onChange={(val) => setValue("date_effet", val, { shouldValidate: true, shouldDirty: true })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_premiere_echeance">Date Première Échéance</Label>
                            <DatePickerInput
                                id="date_premiere_echeance"
                                value={watch("date_premiere_echeance")}
                                onChange={(val) => setValue("date_premiere_echeance", val, { shouldValidate: true, shouldDirty: true })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 4 : REMBOURSEMENT ────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-purple-600" />
                        Remboursement
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="periodicite_remboursement">Périodicité du Remboursement</Label>
                            <Select
                                onValueChange={(v) => setValue("periodicite_remboursement", v, { shouldValidate: true, shouldDirty: true })}
                                value={(watch("periodicite_remboursement") as string) || "mensuel"}
                            >
                                <SelectTrigger id="periodicite_remboursement"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mensuel">Mensuel</SelectItem>
                                    <SelectItem value="trimestriel">Trimestriel</SelectItem>
                                    <SelectItem value="semestriel">Semestriel</SelectItem>
                                    <SelectItem value="annuel">Annuel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="origine_des_fonds">Origine des Fonds</Label>
                            <Select
                                onValueChange={(v) => setValue("origine_des_fonds", v)}
                                value={(watch("origine_des_fonds") as string) || ""}
                            >
                                <SelectTrigger id="origine_des_fonds"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="salaire">Salaire</SelectItem>
                                    <SelectItem value="revenu_commercial">Revenu Commercial</SelectItem>
                                    <SelectItem value="epargne">Épargne</SelectItem>
                                    <SelectItem value="heritage">Héritage</SelectItem>
                                    <SelectItem value="don">Don</SelectItem>
                                    <SelectItem value="autre">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 5 : CONTRAT NSIA EXISTANT ────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        Contrat NSIA Existant
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="deja_souscrit_nsia"
                            checked={dejaSouscritNsia === true}
                            onCheckedChange={(checked) => setValue("deja_souscrit_nsia", !!checked)}
                        />
                        <Label htmlFor="deja_souscrit_nsia" className="text-sm font-medium cursor-pointer">
                            L'assuré a déjà souscrit un contrat NSIA Vie
                        </Label>
                    </div>
                    {dejaSouscritNsia === true && (
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="details_contrat_nsia">Détails du contrat existant</Label>
                            <Input
                                id="details_contrat_nsia"
                                {...register("details_contrat_nsia")}
                                placeholder="N° de contrat ou détails"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
