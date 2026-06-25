import React from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, GraduationCap, Wallet, Heart, FileText } from 'lucide-react';

interface ConfortEtudesSectionProps {
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
}

// Montants rente options
const MONTANTS_RENTE = [
    { value: "100000", label: "100 000 FCFA" },
    { value: "200000", label: "200 000 FCFA" },
    { value: "300000", label: "300 000 FCFA" },
    { value: "500000", label: "500 000 FCFA" },
    { value: "750000", label: "750 000 FCFA" },
    { value: "1000000", label: "1 000 000 FCFA" },
    { value: "1500000", label: "1 500 000 FCFA" },
    { value: "2000000", label: "2 000 000 FCFA" },
    { value: "2500000", label: "2 500 000 FCFA" },
    { value: "3000000", label: "3 000 000 FCFA" },
];

export const ConfortEtudesSection: React.FC<ConfortEtudesSectionProps> = ({ register, setValue, watch, errors }) => {
    const assureEstSouscripteur = watch("assure_est_souscripteur");
    const dejaSouscritNsia = watch("deja_souscrit_nsia");
    const beneficiaireTermeAssure = watch("beneficiaire_terme_assure");
    const beneficiaireDecesAutres = watch("beneficiaire_deces_autres");

    return (
        <div className="space-y-6">

            {/* ── SECTION 1 : SOUSCRIPTEUR ─────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        Souscripteur
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="assure_est_souscripteur"
                            checked={assureEstSouscripteur !== false}
                            onCheckedChange={(checked) => setValue("assure_est_souscripteur", !!checked)}
                        />
                        <Label htmlFor="assure_est_souscripteur" className="text-sm font-medium cursor-pointer">
                            L'assuré est le souscripteur
                        </Label>
                    </div>

                    {assureEstSouscripteur === false && (
                        <div className="border-t pt-4 mt-2 space-y-4">
                            <p className="text-sm text-gray-500 italic">Renseignez les informations du souscripteur (différent de l'assuré)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_civilite">Civilité *</Label>
                                    <Select
                                        onValueChange={(v) => setValue("souscripteur_civilite", v)}
                                        value={(watch("souscripteur_civilite") as string) || ""}
                                    >
                                        <SelectTrigger id="souscripteur_civilite"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Monsieur</SelectItem>
                                            <SelectItem value="Mme">Madame</SelectItem>
                                            <SelectItem value="Mlle">Mademoiselle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_nom">Nom *</Label>
                                    <Input id="souscripteur_nom" {...register("souscripteur_nom")} placeholder="Nom du souscripteur" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_prenoms">Prénoms *</Label>
                                    <Input id="souscripteur_prenoms" {...register("souscripteur_prenoms")} placeholder="Prénoms du souscripteur" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_date_naissance">Date de Naissance *</Label>
                                    <DatePickerInput
                                        id="souscripteur_date_naissance"
                                        value={watch("souscripteur_date_naissance") as string}
                                        onChange={(date) => setValue("souscripteur_date_naissance", date)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_lieu_naissance">Lieu de Naissance</Label>
                                    <Input id="souscripteur_lieu_naissance" {...register("souscripteur_lieu_naissance")} placeholder="Lieu de naissance" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_adresse">Adresse</Label>
                                    <Input id="souscripteur_adresse" {...register("souscripteur_adresse")} placeholder="Adresse postale" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_telephone">Téléphone *</Label>
                                    <Input id="souscripteur_telephone" {...register("souscripteur_telephone")} placeholder="Ex: +242 06 000 00 00" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_profession">Profession</Label>
                                    <Input id="souscripteur_profession" {...register("souscripteur_profession")} placeholder="Profession" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="souscripteur_employeur">Employeur</Label>
                                    <Input id="souscripteur_employeur" {...register("souscripteur_employeur")} placeholder="Nom de l'employeur" />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── SECTION 2 : PARAMÈTRES ÉTUDES ────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                        Paramètres Études
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="age_parent">Âge du Parent (calculé)</Label>
                            <Input
                                id="age_parent"
                                type="number"
                                value={watch("age_parent") || ""}
                                readOnly
                                className="bg-gray-100 cursor-not-allowed"
                                title="Calculé automatiquement au 1er janvier à partir de la date de naissance"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="age_enfant">Âge de l'Enfant *</Label>
                            <Input
                                id="age_enfant"
                                type="number"
                                min={0}
                                max={25}
                                value={watch("age_enfant") || ""}
                                onChange={(e) => setValue("age_enfant", parseInt(e.target.value) || 0, { shouldValidate: true, shouldDirty: true })}
                            />
                            {errors.age_enfant && <p className="text-xs text-red-500">{String(errors.age_enfant.message)}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="montant_rente">Montant Rente Annuelle (FCFA) *</Label>
                            <Select
                                onValueChange={(v) => setValue("montant_rente", Number(v), { shouldValidate: true, shouldDirty: true })}
                                value={watch("montant_rente")?.toString() || ""}
                            >
                                <SelectTrigger id="montant_rente">
                                    <SelectValue placeholder="Sélectionner le montant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTANTS_RENTE.map(({ value, label }) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_paiement">Durée Cotisation (ans) *</Label>
                            <Input
                                id="duree_paiement"
                                type="number"
                                min={1}
                                max={25}
                                value={watch("duree_paiement") || ""}
                                onChange={(e) => setValue("duree_paiement", parseInt(e.target.value) || 0, { shouldValidate: true, shouldDirty: true })}
                            />
                            {errors.duree_paiement && <p className="text-xs text-red-500">{String(errors.duree_paiement.message)}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_service">Durée Service Rentes *</Label>
                            <Select
                                onValueChange={(v) => setValue("duree_service", Number(v), { shouldValidate: true, shouldDirty: true })}
                                value={watch("duree_service")?.toString() || ""}
                            >
                                <SelectTrigger id="duree_service">
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 ans</SelectItem>
                                    <SelectItem value="4">4 ans</SelectItem>
                                    <SelectItem value="5">5 ans</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Durée de service de la rente (3, 4 ou 5 ans)</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_premiere_cotisation">Date 1ère Cotisation</Label>
                            <DatePickerInput
                                id="date_premiere_cotisation"
                                value={watch("date_premiere_cotisation") as string}
                                onChange={(date) => setValue("date_premiere_cotisation", date, { shouldValidate: true, shouldDirty: true })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 3 : COTISATION & MODALITÉS ───────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-600" />
                        Modalités de Paiement
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="periodicite">Périodicité *</Label>
                            <Select
                                onValueChange={(v) => setValue("periodicite", v, { shouldValidate: true, shouldDirty: true })}
                                value={(watch("periodicite") as string) || ""}
                            >
                                <SelectTrigger id="periodicite"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mensuelle">Mensuelle</SelectItem>
                                    <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                                    <SelectItem value="semestrielle">Semestrielle</SelectItem>
                                    <SelectItem value="annuelle">Annuelle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mode_paiement">Mode de Paiement</Label>
                            <Select
                                onValueChange={(v) => setValue("mode_paiement", v, { shouldValidate: true, shouldDirty: true })}
                                value={(watch("mode_paiement") as string) || ""}
                            >
                                <SelectTrigger id="mode_paiement"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="prelevement_salaire">Prélèvement sur Salaire</SelectItem>
                                    <SelectItem value="prelevement_bancaire">Prélèvement Bancaire</SelectItem>
                                    <SelectItem value="cheque">Chèque</SelectItem>
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

            {/* ── SECTION 4 : CONTRAT NSIA EXISTANT ────────────────── */}
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

            {/* ── SECTION 5 : BÉNÉFICIAIRES ────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        Bénéficiaires
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Bénéficiaire au terme */}
                    <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Bénéficiaire au Terme</h5>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="beneficiaire_terme_assure"
                                checked={beneficiaireTermeAssure !== false}
                                onCheckedChange={(checked) => setValue("beneficiaire_terme_assure", !!checked)}
                            />
                            <Label htmlFor="beneficiaire_terme_assure" className="text-sm cursor-pointer">
                                Le bénéficiaire au terme est l'assuré lui-même
                            </Label>
                        </div>
                        {beneficiaireTermeAssure === false && (
                            <p className="text-xs text-amber-600 mt-2 ml-7">
                                Les bénéficiaires au terme seront renseignés dans la section dédiée ci-dessous.
                            </p>
                        )}
                    </div>

                    {/* Bénéficiaires en cas de décès */}
                    <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Bénéficiaires en cas de Décès</h5>
                        <p className="text-xs text-gray-500 mb-3">
                            Cochez les catégories de bénéficiaires en cas de décès de l'assuré :
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="beneficiaire_deces_conjoint"
                                    checked={watch("beneficiaire_deces_conjoint") === true}
                                    onCheckedChange={(checked) => setValue("beneficiaire_deces_conjoint", !!checked)}
                                />
                                <Label htmlFor="beneficiaire_deces_conjoint" className="text-sm cursor-pointer">
                                    Conjoint(e)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="beneficiaire_deces_enfants"
                                    checked={watch("beneficiaire_deces_enfants") === true}
                                    onCheckedChange={(checked) => setValue("beneficiaire_deces_enfants", !!checked)}
                                />
                                <Label htmlFor="beneficiaire_deces_enfants" className="text-sm cursor-pointer">
                                    Enfants nés et à naître
                                </Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="beneficiaire_deces_autres"
                                    checked={beneficiaireDecesAutres === true}
                                    onCheckedChange={(checked) => setValue("beneficiaire_deces_autres", !!checked)}
                                />
                                <Label htmlFor="beneficiaire_deces_autres" className="text-sm cursor-pointer">
                                    Autres bénéficiaires désignés
                                </Label>
                            </div>
                        </div>
                        {beneficiaireDecesAutres === true && (
                            <p className="text-xs text-amber-600 mt-3 ml-7">
                                Les bénéficiaires désignés seront renseignés dans la section dédiée ci-dessous.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Hidden registers */}
            <input type="hidden" {...register("age_parent")} />
            <input type="hidden" {...register("age_enfant")} />
            <input type="hidden" {...register("montant_rente")} />
            <input type="hidden" {...register("duree_paiement")} />
            <input type="hidden" {...register("duree_service")} />
        </div>
    );
};
