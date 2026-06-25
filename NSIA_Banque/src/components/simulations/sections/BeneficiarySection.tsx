import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BeneficiaryConfig } from '@/src/domain/products/base/Product';
// Assuming Beneficiary type is exported from types (based on SimulationForm usage)
import { Beneficiary } from '@/src/domain/beneficiaries/Beneficiary';
import { BENEFICIARY_QUALITES } from '@/src/domain/beneficiaries/Beneficiary';

interface BeneficiarySectionProps {
    config: BeneficiaryConfig;
    beneficiaries: Beneficiary[];
    onUpdate: (beneficiaries: Beneficiary[]) => void;
}

export const BeneficiarySection: React.FC<BeneficiarySectionProps> = ({ config, beneficiaries, onUpdate }) => {
    if (!config.isVisible) return null;

    const maxBeneficiaries = config.maxBeneficiaries || 10;
    const isEditable = config.isEditable !== false;

    const handleAdd = () => {
        const newOrder = beneficiaries.length + 1;
        onUpdate([...beneficiaries, {
            qualite: "conjoint",
            nom_prenoms: "",
            part_pourcentage: 0,
            ordre: newOrder
        }]);
    };

    const handleRemove = (index: number) => {
        onUpdate(beneficiaries.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof Beneficiary, value: any) => {
        const updated = [...beneficiaries];
        updated[index] = { ...updated[index], [field]: value };
        onUpdate(updated);
    };

    const calculateTotal = () => {
        if (config.excludesAssureFromTotal) {
            return beneficiaries.filter(b => b.qualite !== 'assure').reduce((sum, b) => sum + b.part_pourcentage, 0);
        }
        return beneficiaries.reduce((sum, b) => sum + b.part_pourcentage, 0);
    };

    const total = calculateTotal();
    const isError = Math.abs(total - 100) > 0.1 && beneficiaries.length > 0;

    return (
        <Card className="mt-6 border-dashed border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-base text-blue-800">
                            Bénéficiaires
                        </CardTitle>
                    </div>
                    {/* Bouton Ajouter */}
                    {beneficiaries.length < maxBeneficiaries && isEditable && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAdd}
                            className="text-blue-600 border-blue-300 hover:bg-blue-100"
                        >
                            <Plus className="h-4 w-4 mr-1" /> Ajouter
                        </Button>
                    )}
                </div>

                {/* Validation Total */}
                {beneficiaries.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                        <span>Total des parts{config.excludesAssureFromTotal ? " (hors assuré)" : ""}: {total}%</span>
                        {isError && (
                            <span className="text-orange-600 ml-2">(doit être égal à 100%)</span>
                        )}
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {beneficiaries.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Aucun bénéficiaire ajouté. Cliquez sur "Ajouter" pour ajouter un bénéficiaire.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {beneficiaries.map((ben, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-white rounded-lg border border-gray-200">
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-xs text-gray-600">Qualité</Label>
                                    <Select
                                        value={ben.qualite}
                                        onValueChange={(v) => handleChange(index, 'qualite', v)}
                                        disabled={!isEditable}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {config.allowedQualites.map((q) => (
                                                <SelectItem key={q} value={q}>
                                                    {BENEFICIARY_QUALITES[q] || q}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <Label className="text-xs text-gray-600">Nom et Prénoms</Label>
                                    <Input
                                        value={ben.nom_prenoms}
                                        disabled={!isEditable}
                                        onChange={(e) => handleChange(index, 'nom_prenoms', e.target.value)}
                                        placeholder="Nom complet"
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs text-gray-600">Part (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        disabled={!isEditable}
                                        value={ben.part_pourcentage || ""}
                                        onChange={(e) => handleChange(index, 'part_pourcentage', parseFloat(e.target.value) || 0)}
                                        placeholder="Ex: 50"
                                        className="h-9"
                                    />
                                </div>

                                <input type="hidden" value={ben.ordre} />

                                <div className="col-span-1">
                                    {isEditable && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(index)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
