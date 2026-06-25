'use client';

/**
 * Presentation: Epargne Plus Product Form
 * Extracted from SimulationForm.tsx for modularity
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker';
import { BeneficiaryManager } from '@/src/presentation/shared/BeneficiaryManager';
import { ProductFormProps, formatNumberWithSpaces, parseFormattedNumber } from '@/src/presentation/shared/types';

interface EpargnePlusFormProps extends ProductFormProps { }

export function EpargnePlusForm({
    register,
    errors,
    watch,
    setValue,
    beneficiaires,
    onBeneficiairesChange,
}: EpargnePlusFormProps) {
    return (
        <div className="space-y-6">
            {/* Section 1: Informations du Contrat */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                    Informations du Contrat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cotisation_mensuelle">Cotisation Mensuelle (FCFA) *</Label>
                        <Input
                            id="cotisation_mensuelle"
                            type="text"
                            placeholder="Ex: 10 000"
                            value={formatNumberWithSpaces(watch('cotisation_mensuelle'))}
                            onChange={(e) => setValue('cotisation_mensuelle', parseFormattedNumber(e.target.value), { shouldValidate: true })}
                        />
                        {errors.cotisation_mensuelle && (
                            <p className="text-xs text-red-600">{errors.cotisation_mensuelle.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="duree_annees">Durée (ans) *</Label>
                        <Input
                            id="duree_annees"
                            type="number"
                            min="1"
                            max="30"
                            {...register('duree_annees', { valueAsNumber: true })}
                        />
                        {errors.duree_annees && (
                            <p className="text-xs text-red-600">{errors.duree_annees.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="numero_compte_cle">N° Compte Clé *</Label>
                        <Input
                            id="numero_compte_cle"
                            {...register('numero_compte_cle')}
                            placeholder="Ex: 06"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="age_epargne">Age (calculé)</Label>
                        <Input
                            id="age_epargne"
                            type="number"
                            {...register('age', { valueAsNumber: true })}
                            readOnly
                            className="bg-gray-100 cursor-not-allowed"
                        />
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
                            onValueChange={(v) => setValue('deja_souscrit_nsia', v === 'oui')}
                            defaultValue={watch('deja_souscrit_nsia') ? 'oui' : 'non'}
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
                    {watch('deja_souscrit_nsia') && (
                        <div className="space-y-2">
                            <Label htmlFor="contrats_nsia_existants">Liste des contrats existants</Label>
                            <Input
                                id="contrats_nsia_existants"
                                {...register('contrats_nsia_existants')}
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
                            value={watch('date_effet') as string}
                            onChange={(date: string) => setValue('date_effet', date)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date_premiere_cotisation">Date Première Cotisation *</Label>
                        <DatePickerInput
                            id="date_premiere_cotisation"
                            value={watch('date_premiere_cotisation') as string}
                            onChange={(date: string) => setValue('date_premiere_cotisation', date)}
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
                            onValueChange={(v) => setValue('periodicite', v)}
                            defaultValue={watch('periodicite') as string || 'M'}
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
                            onValueChange={(v) => setValue('mode_paiement', v)}
                            defaultValue={watch('mode_paiement') as string}
                        >
                            <SelectTrigger id="mode_paiement">
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
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
                            onValueChange={(v) => setValue('origine_fonds', v)}
                            defaultValue={watch('origine_fonds') as string}
                        >
                            <SelectTrigger id="origine_fonds">
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
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

            {/* Section 5: Bénéficiaires */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">5</span>
                    Désignation des Bénéficiaires
                </h4>
                <BeneficiaryManager
                    beneficiaires={beneficiaires}
                    onChange={onBeneficiairesChange}
                    maxTotal={100}
                    title="Bénéficiaires en cas de décès"
                />
            </div>
        </div>
    );
}
