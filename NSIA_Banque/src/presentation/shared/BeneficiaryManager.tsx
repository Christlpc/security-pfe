'use client';

/**
 * Presentation: BeneficiaryManager Component
 * Reusable component for managing beneficiaries across all products
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Users, AlertCircle } from 'lucide-react';
import { BeneficiaryEntry } from './types';

interface BeneficiaryManagerProps {
    beneficiaires: BeneficiaryEntry[];
    onChange: (beneficiaires: BeneficiaryEntry[]) => void;
    maxTotal?: number;
    showOrganismePret?: boolean;
    showAssure?: boolean;
    showEnfantANaitre?: boolean;
    title?: string;
}

const QUALITE_OPTIONS = [
    { value: 'conjoint', label: 'Conjoint(e)' },
    { value: 'enfant', label: 'Enfant' },
    { value: 'parent', label: 'Parent' },
    { value: 'autre', label: 'Autre' },
];

const QUALITE_OPTIONS_EXTENDED = [
    ...QUALITE_OPTIONS,
    { value: 'organisme_pret', label: 'Organisme de prêt' },
    { value: 'assure', label: 'Assuré' },
    { value: 'enfant_a_naitre', label: 'Enfant à naître' },
];

export function BeneficiaryManager({
    beneficiaires,
    onChange,
    maxTotal = 100,
    showOrganismePret = false,
    showAssure = false,
    showEnfantANaitre = false,
    title = 'Bénéficiaires',
}: BeneficiaryManagerProps) {
    const [error, setError] = useState<string | null>(null);

    // Calculate total percentage
    const totalPercentage = beneficiaires.reduce((sum, b) => sum + (b.part_pourcentage || 0), 0);
    const isValid = Math.abs(totalPercentage - maxTotal) < 0.01;

    // Get available options based on props
    const getOptions = () => {
        let options = [...QUALITE_OPTIONS];
        if (showOrganismePret) options.push({ value: 'organisme_pret', label: 'Organisme de prêt' });
        if (showAssure) options.push({ value: 'assure', label: 'Assuré' });
        if (showEnfantANaitre) options.push({ value: 'enfant_a_naitre', label: 'Enfant à naître' });
        return options;
    };

    const addBeneficiaire = () => {
        const newOrdre = beneficiaires.length + 1;
        const remainingPercentage = Math.max(0, maxTotal - totalPercentage);

        onChange([
            ...beneficiaires,
            {
                qualite: 'conjoint',
                nom_prenoms: '',
                part_pourcentage: remainingPercentage,
                ordre: newOrdre,
            },
        ]);
        setError(null);
    };

    const removeBeneficiaire = (index: number) => {
        const updated = beneficiaires
            .filter((_, i) => i !== index)
            .map((b, i) => ({ ...b, ordre: i + 1 }));
        onChange(updated);
    };

    const updateBeneficiaire = (index: number, field: keyof BeneficiaryEntry, value: any) => {
        const updated = [...beneficiaires];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBeneficiaire}
                    className="gap-1"
                >
                    <Plus className="w-4 h-4" /> Ajouter
                </Button>
            </div>

            {/* Total percentage indicator */}
            <div className={`text-sm px-3 py-2 rounded-lg ${isValid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                Total des parts : <strong>{totalPercentage.toFixed(2)}%</strong>
                {!isValid && ` (doit être ${maxTotal}%)`}
            </div>

            {beneficiaires.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun bénéficiaire ajouté</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter" pour désigner un bénéficiaire</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {beneficiaires.map((beneficiaire, index) => (
                        <Card key={index} className="border border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Order number */}
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                                        {beneficiaire.ordre}
                                    </div>

                                    {/* Fields */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Qualité */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">Qualité</Label>
                                            <Select
                                                value={beneficiaire.qualite}
                                                onValueChange={(v) => updateBeneficiaire(index, 'qualite', v)}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getOptions().map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Nom et Prénoms */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">Nom et Prénoms</Label>
                                            <Input
                                                value={beneficiaire.nom_prenoms}
                                                onChange={(e) => updateBeneficiaire(index, 'nom_prenoms', e.target.value)}
                                                placeholder="Nom complet"
                                                className="h-9"
                                            />
                                        </div>

                                        {/* Part pourcentage */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">Part (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={beneficiaire.part_pourcentage}
                                                onChange={(e) => updateBeneficiaire(index, 'part_pourcentage', parseFloat(e.target.value) || 0)}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeBeneficiaire(index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
