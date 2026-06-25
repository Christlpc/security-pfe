"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { questionnairesApi } from "@/lib/api/simulations";
import type { QuestionnaireResponse } from "@/types";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import toast from "react-hot-toast";

export default function QuestionnairesPage() {
  const router = useSafeRouter();
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionnaires = async () => {
      setIsLoading(true);
      try {
        const data = await questionnairesApi.getQuestionnaires();
        setQuestionnaires(data);
      } catch (error: any) {
        toast.error(error?.message || "Erreur lors du chargement des questionnaires");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionnaires();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Questionnaires Médicaux</h1>
            <p className="text-gray-600 mt-2">Gérez tous les questionnaires médicaux</p>
          </div>
        </div>
      </div>

      {questionnaires.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun questionnaire</h3>
              <p className="mt-2 text-sm text-gray-500">
                Les questionnaires médicaux apparaîtront ici une fois créés.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questionnaires.map((questionnaire) => (
            <Card
              key={questionnaire.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/questionnaires/${questionnaire.id}`)}
            >
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">ID</span>
                    <span className="text-sm font-mono">{questionnaire.id}</span>
                  </div>
                  {questionnaire.simulation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Simulation</span>
                      <span className="text-sm font-mono">{questionnaire.simulation.slice(0, 8)}</span>
                    </div>
                  )}
                  {questionnaire.taux_surprime !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Surprime</span>
                      <span className="text-sm font-semibold">{questionnaire.taux_surprime}%</span>
                    </div>
                  )}
                  {questionnaire.categorie_risque && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Risque</span>
                      <span className="text-sm capitalize">{questionnaire.categorie_risque}</span>
                    </div>
                  )}
                  {questionnaire.date_remplissage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Créé le</span>
                      <span className="text-sm">
                        {format(new Date(questionnaire.date_remplissage), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

