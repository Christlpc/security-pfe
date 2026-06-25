"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BIAPreview } from "@/components/exports/BIAPreview";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { simulationApi } from "@/lib/api/simulations";
import toast from "react-hot-toast";

export default function ExportPage() {
  const params = useParams();
  const router = useSafeRouter();
  const { currentSimulation, fetchSimulation, isLoading } = useSimulationStore();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchSimulation(id);
      loadPreview();
    }
  }, [id, fetchSimulation]);

  const loadPreview = async () => {
    setIsLoadingPdf(true);
    try {
      const url = await simulationApi.previewBIA(id);
      setPdfUrl(url);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du PDF");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await simulationApi.exportBIA(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BIA_${currentSimulation?.reference || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF téléchargé avec succès");
    } catch (error: any) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!currentSimulation) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Simulation introuvable</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/simulations/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Export BIA</h1>
            <p className="text-gray-600 mt-2">
              Simulation {currentSimulation.reference}
            </p>
          </div>
        </div>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Télécharger PDF
        </Button>
      </div>
      {isLoadingPdf ? (
        <div className="text-center py-12 text-gray-500">Chargement du PDF...</div>
      ) : pdfUrl ? (
        <BIAPreview pdfUrl={pdfUrl} />
      ) : (
        <div className="text-center py-12 text-gray-500">Erreur lors du chargement du PDF</div>
      )}
    </div>
  );
}

