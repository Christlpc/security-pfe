import React from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { mobateliProduct } from '@/src/domain/products/mobateli/MobateliProduct';
import { formatNumberWithSpaces, parseFormattedNumber } from '@/lib/utils/format';
import { UserCheck, Shield, Users, Heart, Wallet, Calendar, Plus, Trash2, Calculator, Zap } from 'lucide-react';

interface MobateliSectionProps {
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
}

export const MobateliSection: React.FC<MobateliSectionProps> = ({ register, setValue, watch, errors }) => {
    const assureEstSouscripteur = watch("assure_est_souscripteur");
    const enfants: any[] = watch("enfants") || [];
    const modeCalcul = watch("mode_calcul") || 'forfaitaire';
    const volet = watch("volet") || 'dtc';

    // Gestion des enfants
    const addEnfant = () => {
        setValue("enfants", [...enfants, { nom_prenoms: '', date_naissance: '' }]);
    };
    const removeEnfant = (index: number) => {
        setValue("enfants", enfants.filter((_: any, i: number) => i !== index));
    };
    const updateEnfant = (index: number, field: string, value: string) => {
        const updated = [...enfants];
        updated[index] = { ...updated[index], [field]: value };
        setValue("enfants", updated);
    };

    const isSurMesure = modeCalcul === 'sur_mesure';

    return (
        <div className="space-y-6">

            {/* ── SECTION 0 : MODE DE CALCUL ──────────────────────── */}
            <Card className="border-2 border-indigo-200 shadow-sm bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-indigo-600" />
                        Mode de Calcul
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setValue("mode_calcul", "forfaitaire")}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                !isSurMesure
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!isSurMesure ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Shield className="h-4 w-4" />
                                </div>
                                <span className={`font-semibold ${!isSurMesure ? 'text-indigo-700' : 'text-gray-700'}`}>
                                    Table Tarifaire
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 ml-11">
                                Calcul forfaitaire par capital et tranche d'âge
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue("mode_calcul", "sur_mesure")}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                isSurMesure
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSurMesure ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Zap className="h-4 w-4" />
                                </div>
                                <span className={`font-semibold ${isSurMesure ? 'text-purple-700' : 'text-gray-700'}`}>
                                    Sur Mesure
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 ml-11">
                                Calcul actuariel personnalisé (CIMA_H)
                            </p>
                        </button>
                    </div>
                </CardContent>
            </Card>

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
                                    <Label>Civilité *</Label>
                                    <Select onValueChange={(v) => setValue("souscripteur_civilite", v)} value={(watch("souscripteur_civilite") as string) || ""}>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Monsieur</SelectItem>
                                            <SelectItem value="Mme">Madame</SelectItem>
                                            <SelectItem value="Mlle">Mademoiselle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom *</Label>
                                    <Input {...register("souscripteur_nom")} placeholder="Nom" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prénoms *</Label>
                                    <Input {...register("souscripteur_prenoms")} placeholder="Prénoms" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date de Naissance *</Label>
                                    <DatePickerInput id="souscripteur_dn" value={watch("souscripteur_date_naissance") as string} onChange={(d) => setValue("souscripteur_date_naissance", d)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lieu de Naissance</Label>
                                    <Input {...register("souscripteur_lieu_naissance")} placeholder="Lieu" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Adresse</Label>
                                    <Input {...register("souscripteur_adresse")} placeholder="Adresse" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Téléphone *</Label>
                                    <Input {...register("souscripteur_telephone")} placeholder="+242 06 000 00 00" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Profession</Label>
                                    <Input {...register("souscripteur_profession")} placeholder="Profession" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Employeur</Label>
                                    <Input {...register("souscripteur_employeur")} placeholder="Employeur" />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── SECTION 2 : GARANTIES / PARAMÈTRES ──────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-orange-600" />
                        {isSurMesure ? 'Paramètres Sur Mesure' : 'Garanties'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* ── MODE FORFAITAIRE ─── */}
                    {!isSurMesure && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="numero_convention">Numéro Convention</Label>
                                <Input id="numero_convention" value={watch("numero_convention") || ""} readOnly className="bg-gray-50 text-gray-600 cursor-not-allowed" tabIndex={-1} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capital_dtc_iad">Capital DTC/IAD (FCFA) *</Label>
                                <Select
                                    onValueChange={(v) => setValue("capital_dtc_iad", parseInt(v), { shouldValidate: true, shouldDirty: true })}
                                    value={watch("capital_dtc_iad")?.toString() || ""}
                                >
                                    <SelectTrigger id="capital_dtc_iad"><SelectValue placeholder="Sélectionner le capital" /></SelectTrigger>
                                    <SelectContent>
                                        {mobateliProduct.allowedCapitals.map((cap) => (
                                            <SelectItem key={cap} value={cap.toString()}>
                                                {cap.toLocaleString("fr-FR")} FCFA
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">Décès Toutes Causes / Invalidité Absolue et Définitive</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="option_frais_funeraires">Option Frais Funéraires</Label>
                                <Select
                                    onValueChange={(v) => setValue("option_frais_funeraires", v)}
                                    value={(watch("option_frais_funeraires") as string) || ""}
                                >
                                    <SelectTrigger id="option_frais_funeraires"><SelectValue placeholder="Aucune option" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aucune">Aucune</SelectItem>
                                        <SelectItem value="option_1">Option 1 : 500 000 / adulte, 250 000 / enfant</SelectItem>
                                        <SelectItem value="option_2">Option 2 : 750 000 / adulte, 375 000 / enfant</SelectItem>
                                        <SelectItem value="option_3">Option 3 : 1 000 000 / adulte, 500 000 / enfant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="age">Âge de l'Assuré (calculé)</Label>
                                <Input id="age" type="number" {...register("age", { valueAsNumber: true })} readOnly className="bg-gray-100 cursor-not-allowed" />
                            </div>
                        </div>
                    )}

                    {/* ── MODE SUR MESURE ─── */}
                    {isSurMesure && (
                        <>
                            {/* Champs communs sur mesure */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="numero_convention_sm">Numéro Convention</Label>
                                    <Input id="numero_convention_sm" value={watch("numero_convention") || ""} readOnly className="bg-gray-50 text-gray-600 cursor-not-allowed" tabIndex={-1} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duree_engagement_sm">Durée du Contrat (ans)</Label>
                                    <Input
                                        id="duree_engagement_sm"
                                        type="number"
                                        min={1}
                                        {...register("duree_engagement", { valueAsNumber: true })}
                                        placeholder="Ex: 10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age_sm">Âge de l'Assuré (calculé)</Label>
                                    <Input id="age_sm" type="number" {...register("age", { valueAsNumber: true })} readOnly className="bg-gray-100 cursor-not-allowed" />
                                </div>
                            </div>

                            {/* Volet selector */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">Volet de calcul *</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setValue("volet", "dtc")}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                                            volet === 'dtc'
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`font-semibold text-sm ${volet === 'dtc' ? 'text-purple-700' : 'text-gray-700'}`}>
                                            Volet DTC : Prime → Capital
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Vous définissez la prime souhaitée, le système calcule le capital garanti
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setValue("volet", "dtc_ff")}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                                            volet === 'dtc_ff'
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`font-semibold text-sm ${volet === 'dtc_ff' ? 'text-purple-700' : 'text-gray-700'}`}>
                                            Volet DTC + FF : Capital → Prime
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Vous choisissez le capital, le système calcule la prime avec frais funéraires
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Champs Volet DTC */}
                            {volet === 'dtc' && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prime_souhaitee">Prime souhaitée (FCFA) *</Label>
                                        <Input
                                            id="prime_souhaitee"
                                            type="text"
                                            placeholder="Ex: 100 000"
                                            value={formatNumberWithSpaces(watch("prime_souhaitee"))}
                                            onChange={(e) => setValue("prime_souhaitee", parseFormattedNumber(e.target.value), { shouldValidate: true })}
                                        />
                                        {errors.prime_souhaitee && <p className="text-xs text-red-500">{String(errors.prime_souhaitee.message)}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duree_sur_mesure">Durée (années) *</Label>
                                        <Select
                                            onValueChange={(v) => setValue("duree_sur_mesure", parseInt(v))}
                                            value={(watch("duree_sur_mesure") || 1).toString()}
                                        >
                                            <SelectTrigger id="duree_sur_mesure"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map((d) => (
                                                    <SelectItem key={d} value={d.toString()}>{d} an{d > 1 ? 's' : ''}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type_prime">Type de Prime *</Label>
                                        <Select
                                            onValueChange={(v) => setValue("type_prime", v)}
                                            value={(watch("type_prime") as string) || "annuelle"}
                                        >
                                            <SelectTrigger id="type_prime"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="annuelle">Prime Annuelle</SelectItem>
                                                <SelectItem value="unique">Prime Unique</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Âge (calculé)</Label>
                                        <Input id="age" type="number" {...register("age", { valueAsNumber: true })} readOnly className="bg-gray-100 cursor-not-allowed" />
                                    </div>
                                </div>
                            )}

                            {/* Champs Volet DTC+FF */}
                            {volet === 'dtc_ff' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="capital_sur_mesure">Capital DTC (FCFA) *</Label>
                                        <Select
                                            onValueChange={(v) => setValue("capital_sur_mesure", parseInt(v), { shouldValidate: true })}
                                            value={(watch("capital_sur_mesure") || watch("capital_dtc_iad"))?.toString() || ""}
                                        >
                                            <SelectTrigger id="capital_sur_mesure"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                            <SelectContent>
                                                {mobateliProduct.allowedCapitals.map((cap) => (
                                                    <SelectItem key={cap} value={cap.toString()}>
                                                        {cap.toLocaleString("fr-FR")} FCFA
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500">Les frais funéraires (4 000 000 FCFA) sont ajoutés automatiquement</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Âge (calculé)</Label>
                                        <Input id="age" type="number" {...register("age", { valueAsNumber: true })} readOnly className="bg-gray-100 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date_souscription">Date de Souscription</Label>
                                        <DatePickerInput
                                            id="date_souscription"
                                            value={watch("date_souscription") as string}
                                            onChange={(val) => setValue("date_souscription", val)}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── SECTION 3 : IDENTIFICATION FAMILIALE ─────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-teal-600" />
                        Identification Familiale
                        <span className="text-xs text-gray-400 font-normal ml-2">(si couverture frais funéraires famille)</span>
                    </CardTitle>
                </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Conjoint */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">Conjoint</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Civilité</Label>
                                    <Select
                                        onValueChange={(v) => setValue("conjoint.civilite", v)}
                                        value={(watch("conjoint.civilite") as string) || ""}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">M.</SelectItem>
                                            <SelectItem value="MME">Mme</SelectItem>
                                            <SelectItem value="MLLE">Mlle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Nom</Label>
                                    <Input {...register("conjoint.nom")} placeholder="Nom du conjoint" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Prénoms</Label>
                                    <Input {...register("conjoint.prenoms")} placeholder="Prénoms" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Date de Naissance</Label>
                                    <DatePickerInput
                                        id="conjoint_dn"
                                        value={watch("conjoint.date_naissance") as string}
                                        onChange={(d) => setValue("conjoint.date_naissance", d)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Lieu de Naissance</Label>
                                    <Input {...register("conjoint.lieu_naissance")} placeholder="Lieu" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Mobile</Label>
                                    <Input {...register("conjoint.mobile")} placeholder="Téléphone" />
                                </div>
                            </div>
                        </div>

                        {/* Enfants */}
                        <div className="border-t pt-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">Enfants</h5>
                            {enfants.map((enfant: any, index: number) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nom et Prénoms *</Label>
                                        <Input
                                            value={enfant.nom_prenoms || ''}
                                            onChange={(e) => updateEnfant(index, 'nom_prenoms', e.target.value)}
                                            placeholder="Nom complet"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Date de Naissance</Label>
                                        <DatePickerInput
                                            id={`enfant_dn_${index}`}
                                            value={enfant.date_naissance || ''}
                                            onChange={(d) => updateEnfant(index, 'date_naissance', d)}
                                        />
                                    </div>
                                    <div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEnfant(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {enfants.length < 6 && (
                                <Button type="button" variant="outline" size="sm" onClick={addEnfant} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Ajouter un enfant
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

            {/* ── SECTION 4 : BÉNÉFICIAIRES PRÉDÉFINIS ─────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        Bénéficiaires en cas de Décès
                    </CardTitle>
                </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-xs text-gray-500 mb-2">Cochez les catégories de bénéficiaires en cas de décès de l'assuré principal :</p>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="beneficiaire_deces_conjoint"
                                checked={watch("beneficiaire_deces_conjoint") === true}
                                onCheckedChange={(checked) => setValue("beneficiaire_deces_conjoint", !!checked)}
                            />
                            <Label htmlFor="beneficiaire_deces_conjoint" className="text-sm cursor-pointer">
                                Mon conjoint non divorcé, ni séparé de corps
                            </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="beneficiaire_deces_enfants"
                                checked={watch("beneficiaire_deces_enfants") === true}
                                onCheckedChange={(checked) => setValue("beneficiaire_deces_enfants", !!checked)}
                            />
                            <Label htmlFor="beneficiaire_deces_enfants" className="text-sm cursor-pointer">
                                Mes enfants nés ou à naître
                            </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="beneficiaire_deces_autres"
                                checked={watch("beneficiaire_deces_autres") === true}
                                onCheckedChange={(checked) => setValue("beneficiaire_deces_autres", !!checked)}
                            />
                            <Label htmlFor="beneficiaire_deces_autres" className="text-sm cursor-pointer">
                                Autres bénéficiaires désignés
                            </Label>
                        </div>
                    </CardContent>
                </Card>

            {/* ── SECTION 5 : PAIEMENT ─────────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-purple-600" />
                        Paiement
                    </CardTitle>
                </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mode_paiement">Mode de Paiement</Label>
                                <Select
                                    onValueChange={(v) => setValue("mode_paiement", v, { shouldValidate: true, shouldDirty: true })}
                                    value={(watch("mode_paiement") as string) || ""}
                                >
                                    <SelectTrigger id="mode_paiement"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prelevement_bancaire">Prélèvement Bancaire</SelectItem>
                                        <SelectItem value="prelevement_salaire">Prélèvement sur Salaire</SelectItem>
                                        <SelectItem value="especes">Espèces</SelectItem>
                                        <SelectItem value="cheque">Chèque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type_cotisation">Type de Cotisation</Label>
                                <Select
                                    onValueChange={(v) => setValue("type_cotisation", v)}
                                    value={(watch("type_cotisation") as string) || ""}
                                >
                                    <SelectTrigger id="type_cotisation"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prime_unique">Prime Unique</SelectItem>
                                        <SelectItem value="cotisations_annuelles">Cotisations Annuelles</SelectItem>
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

            {/* ── SECTION 6 : DATES ────────────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        Dates du Contrat
                    </CardTitle>
                </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date_premiere_prime">Date 1ère Prime</Label>
                                <DatePickerInput
                                    id="date_premiere_prime"
                                    value={watch("date_premiere_prime") as string}
                                    onChange={(val) => setValue("date_premiere_prime", val)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date_effet">Date d'Effet</Label>
                                <DatePickerInput
                                    id="date_effet"
                                    value={watch("date_effet") as string}
                                    onChange={(val) => setValue("date_effet", val)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date_echeance">Date d'Échéance</Label>
                                <DatePickerInput
                                    id="date_echeance"
                                    value={watch("date_echeance") as string}
                                    onChange={(val) => setValue("date_echeance", val)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

            {/* Hidden registers */}
            <input type="hidden" {...register("capital_dtc_iad")} />
            <input type="hidden" {...register("mode_calcul")} />
            <input type="hidden" {...register("volet")} />
        </div>
    );
};
