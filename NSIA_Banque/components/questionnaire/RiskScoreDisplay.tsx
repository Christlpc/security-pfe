"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RISK_CATEGORY_LABELS, RISK_CATEGORY_COLORS } from "@/lib/utils/constants";

interface RiskScoreDisplayProps {
  scoreTotal: number;
  tauxSurprime: number | string;
  categorieRisque: string;
}

export function RiskScoreDisplay({
  scoreTotal,
  tauxSurprime,
  categorieRisque,
}: RiskScoreDisplayProps) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle>Résultat du Questionnaire</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Score Total</p>
            <p className="text-2xl font-bold text-gray-900">{scoreTotal} points</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Catégorie de Risque</p>
            <Badge className={RISK_CATEGORY_COLORS[categorieRisque]}>
              {RISK_CATEGORY_LABELS[categorieRisque]}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Taux de Surprime</p>
            <p className="text-2xl font-bold text-blue-600">{tauxSurprime}%</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm text-gray-600">
            {tauxSurprime === 0
              ? "Aucune surprime ne sera appliquée à votre prime."
              : `Une surprime de ${tauxSurprime}% sera appliquée à votre prime de base.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}




