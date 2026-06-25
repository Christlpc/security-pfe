import React from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { UserCheck, GraduationCap, Wallet, DollarSign, Calendar, Plus, Trash2 } from 'lucide-react';
import { elikiaProduct } from '@/src/domain/products/elikia-scolaire/ElikiaProduct';

interface ElikiaSectionProps {
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
}

export const ElikiaSection: React.FC<ElikiaSectionProps> = ({ register, setValue, watch, errors }) => {
    const assureEstSouscripteur = watch("assure_est_souscripteur");
    const modePaiement = watch("mode_paiement");
    const eleves: any[] = watch("eleves") || [];

    // Tarification
    const tarif = watch("rente_annuelle") && watch("age_parent") && watch("duree_rente")
        ? elikiaProduct.calculateTarif(
            watch("rente_annuelle") || 0,
            watch("duree_rente") || 5,
            watch("age_parent") || 0
        )
        : null;

    // Gestion des élèves
    const addEleve = () => {
        setValue("eleves", [...eleves, { nom_prenoms: '', date_naissance: '', qualite: '' }]);
    };

    const removeEleve = (index: number) => {
        const updated = eleves.filter((_, i) => i !== index);
        setValue("eleves", updated);
    };

    const updateEleve = (index: number, field: string, value: string) => {
        const updated = [...eleves];
        updated[index] = { ...updated[index], [field]: value };
        setValue("eleves", updated);
    };

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

            {/* ── SECTION 2 : PARAMÈTRES ELIKIA ────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                        Paramètres du Contrat
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="numero_convention">Numéro Convention</Label>
                            <Input id="numero_convention" value={watch("numero_convention") || ""} readOnly className="bg-gray-50 text-gray-600 cursor-not-allowed" tabIndex={-1} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rente_annuelle">Rente Annuelle (FCFA) *</Label>
                            <Select
                                onValueChange={(v) => setValue("rente_annuelle", parseInt(v), { shouldValidate: true, shouldDirty: true })}
                                value={watch("rente_annuelle")?.toString() || ""}
                            >
                                <SelectTrigger id="rente_annuelle">
                                    <SelectValue placeholder="Sélectionner la rente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {elikiaProduct.rentesAnnuelleOptions.map((rente) => (
                                        <SelectItem key={rente} value={rente.toString()}>
                                            {rente.toLocaleString("fr-FR")} FCFA
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_rente">Durée de la Rente (ans) *</Label>
                            <Select
                                onValueChange={(v) => setValue("duree_rente", parseInt(v), { shouldValidate: true, shouldDirty: true })}
                                value={watch("duree_rente")?.toString() || "5"}
                            >
                                <SelectTrigger id="duree_rente">
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {elikiaProduct.dureesRenteOptions.map((duree) => (
                                        <SelectItem key={duree} value={duree.toString()}>
                                            {duree} ans
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duree_engagement">Durée Engagement (ans)</Label>
                            <Input
                                id="duree_engagement"
                                type="number"
                                min={1}
                                max={10}
                                {...register("duree_engagement", { valueAsNumber: true })}
                                placeholder="Ex: 4"
                            />
                        </div>
                    </div>

                    {/* Âge parent + tranche */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="age_parent">Âge du Parent (calculé)</Label>
                            <Input
                                id="age_parent"
                                type="number"
                                {...register("age_parent", { valueAsNumber: true })}
                                readOnly
                                className="bg-gray-100 cursor-not-allowed"
                                title="Calculé automatiquement"
                            />
                            {watch("age_parent") && elikiaProduct.getTrancheAge(watch("age_parent") || 0) && (
                                <p className="text-xs text-blue-600 font-medium">
                                    Tranche : {elikiaProduct.getTrancheAge(watch("age_parent") || 0)?.label}
                                </p>
                            )}
                            {watch("age_parent") && !elikiaProduct.isEligible(watch("age_parent") || 0) && (
                                <p className="text-xs text-red-600">Âge non éligible (18-64 ans requis)</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── SECTION 3 : ÉLÈVES / ÉTUDIANTS BÉNÉFICIAIRES ─────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                        Élèves / Étudiants Bénéficiaires
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-gray-500">
                        Renseignez les élèves ou étudiants bénéficiaires de la rente scolaire (jusqu'à 4).
                    </p>

                    {eleves.map((eleve, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                            <div className="space-y-1">
                                <Label className="text-xs">Nom et Prénoms *</Label>
                                <Input
                                    value={eleve.nom_prenoms || ''}
                                    onChange={(e) => updateEleve(index, 'nom_prenoms', e.target.value)}
                                    placeholder="Nom complet"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Date de Naissance</Label>
                                <DatePickerInput
                                    id={`eleve_dn_${index}`}
                                    value={eleve.date_naissance || ''}
                                    onChange={(date) => updateEleve(index, 'date_naissance', date)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">En qualité de</Label>
                                <Select
                                    onValueChange={(v) => updateEleve(index, 'qualite', v)}
                                    value={eleve.qualite || ''}
                                >
                                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fils">Fils</SelectItem>
                                        <SelectItem value="fille">Fille</SelectItem>
                                        <SelectItem value="neveu">Neveu</SelectItem>
                                        <SelectItem value="niece">Nièce</SelectItem>
                                        <SelectItem value="petit_fils">Petit-fils</SelectItem>
                                        <SelectItem value="petite_fille">Petite-fille</SelectItem>
                                        <SelectItem value="autre">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEleve(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {eleves.length < 4 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEleve}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter un élève
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* ── SECTION 4 : DATES ────────────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
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
                            <Label htmlFor="date_signature">Date de Signature</Label>
                            <DatePickerInput
                                id="date_signature"
                                value={watch("date_signature") as string}
                                onChange={(val) => setValue("date_signature", val)}
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

            {/* ── SECTION 5 : PAIEMENT ─────────────────────────────── */}
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-purple-600" />
                        Paiement
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                                    <SelectItem value="especes">Espèces</SelectItem>
                                    <SelectItem value="precompte_salaire">Précompte sur Salaire</SelectItem>
                                    <SelectItem value="cheque">Chèque</SelectItem>
                                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {modePaiement === 'mobile_money' && (
                            <div className="space-y-2">
                                <Label htmlFor="operateur_mobile_money">Opérateur Mobile Money</Label>
                                <Input
                                    id="operateur_mobile_money"
                                    {...register("operateur_mobile_money")}
                                    placeholder="Ex: MTN, Airtel..."
                                />
                            </div>
                        )}
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

            {/* ── TARIFICATION CALCULÉE ─────────────────────────────── */}
            {tarif && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Tarification Elikia Scolaire
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                            <p className="text-gray-600 text-xs uppercase tracking-wide">Prime Annuelle</p>
                            <p className="text-xl font-bold text-blue-700 mt-1">
                                {tarif.prime_annuelle.toLocaleString("fr-FR")} FCFA
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                            <p className="text-gray-600 text-xs uppercase tracking-wide">Capital Unique</p>
                            <p className="text-xl font-bold text-green-700 mt-1">
                                {tarif.prime_unique.toLocaleString("fr-FR")} FCFA
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                            <p className="text-gray-600 text-xs uppercase tracking-wide">Tranche d'Âge</p>
                            <p className="text-xl font-bold text-orange-700 mt-1">
                                {tarif.tranche_age}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden registers */}
            <input type="hidden" {...register("rente_annuelle")} />
            <input type="hidden" {...register("duree_rente")} />
        </div>
    );
};
