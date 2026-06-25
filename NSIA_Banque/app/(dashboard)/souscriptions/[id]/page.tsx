"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { souscriptionsApi, type Souscription } from "@/lib/api/simulations";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Check,
  X,
  User,
  Building2,
  FileText,
  Briefcase,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Hash,
  ShieldCheck,
  AlertCircle,
  Clock,
  Activity,
  Calculator
} from "lucide-react";
import { ValidateSouscriptionDialog } from "@/components/souscriptions/ValidateSouscriptionDialog";
import { RejectSouscriptionDialog } from "@/components/souscriptions/RejectSouscriptionDialog";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils/format";

// Fonction utilitaire pour formater les dates en toute sécurité
function safeFormatDate(dateStr: string | null | undefined, formatStr: string = "dd MMMM yyyy"): string {
  if (!dateStr) return "-";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return "-";
    return format(date, formatStr, { locale: fr });
  } catch {
    return "-";
  }
}



const STATUT_STYLES: Record<string, { label: string; className: string; icon: any }> = {
  en_attente: {
    label: "En attente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock
  },
  en_cours: {
    label: "En cours de traitement",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Activity
  },
  validee: {
    label: "Validée",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: ShieldCheck
  },
  rejetee: {
    label: "Rejetée",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle
  },
};

export default function SouscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [souscription, setSouscription] = useState<Souscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSouscription = async () => {
      setIsLoading(true);
      try {
        const data = await souscriptionsApi.getSouscription(id);
        setSouscription(data);
      } catch (error: any) {
        toast.error(error?.message || "Erreur lors du chargement de la souscription");
        // Si erreur, on ne redirige pas tout de suite pour laisser le toast visible, 
        // ou on redirige après un court délai.
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchSouscription();
    }
  }, [id]);

  const handleValidate = async (souscriptionId: string) => {
    try {
      await souscriptionsApi.validateSouscription(souscriptionId);
      toast.success("Souscription validée avec succès");
      const updated = await souscriptionsApi.getSouscription(souscriptionId);
      setSouscription(updated);
      setValidateDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la validation");
    }
  };

  const handleReject = async (souscriptionId: string, raison: string) => {
    try {
      await souscriptionsApi.rejectSouscription(souscriptionId, raison);
      toast.success("Souscription rejetée");
      const updated = await souscriptionsApi.getSouscription(souscriptionId);
      setSouscription(updated);
      setRejectDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du rejet");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!souscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Souscription introuvable</h2>
        <Button onClick={() => router.push("/souscriptions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Use statut_display if available, otherwise fallback to local map
  const statusConfig = STATUT_STYLES[souscription.statut] || { label: souscription.statut, className: "bg-gray-100", icon: Activity };
  const StatusIcon = statusConfig.icon;
  const canValidate = souscription.statut === "en_attente";
  const canReject = souscription.statut === "en_attente";

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/souscriptions")} className="h-9">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {souscription.reference || `Souscription ${souscription.id.slice(0, 8)}`}
              </h1>
              <Badge variant="outline" className={`${statusConfig.className} flex items-center gap-1.5 px-3 py-1 font-medium`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {souscription.statut_display || statusConfig.label}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              Créée le {safeFormatDate(souscription.date_souscription || souscription.created_at, "dd MMMM yyyy 'à' HH:mm")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canValidate && (
            <Button onClick={() => setValidateDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all hover:shadow-md">
              <Check className="mr-2 h-4 w-4" />
              Valider la demande
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} className="shadow-sm hover:shadow-md transition-all">
              <X className="mr-2 h-4 w-4" />
              Rejeter
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client & Main Info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Détails du Souscripteur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col items-center text-center pb-4 border-b border-border/50">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-blue-700">
                    {souscription.prenom.charAt(0)}{souscription.nom.charAt(0)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{souscription.prenom} {souscription.nom}</h3>
                <p className="text-sm text-gray-500">{souscription.profession || "Profession non renseignée"}</p>
              </div>

              <div className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={souscription.email} />
                <InfoRow icon={Phone} label="Téléphone" value={souscription.telephone} />
                <InfoRow icon={Calendar} label="Date de naissance" value={`${safeFormatDate(souscription.date_naissance)} (${souscription.age_souscripteur || "?"} ans)`} />
                <InfoRow icon={MapPin} label="Adresse" value={souscription.adresse} />
                <InfoRow icon={Building2} label="Employeur" value={souscription.employeur} />
                <InfoRow icon={CreditCard} label="Compte bancaire" value={souscription.numero_compte} isMono />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-gray-700">
                <Building2 className="h-4 w-4" />
                Informations Banque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 bg-gray-50/50 px-3 rounded-md">
                <span className="text-gray-500">Banque</span>
                <span className="font-medium">{souscription.banque_nom || "Non renseigné"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 px-3">
                <span className="text-gray-500">Code Banque</span>
                <span className="font-mono">{souscription.banque_code || "-"}</span>
              </div>
              <div className="flex justify-between py-2 px-3">
                <span className="text-gray-500">Gestionnaire</span>
                <span className="font-medium">{souscription.gestionnaire_nom || "-"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Product & Contract (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Product Card */}
          <Card className="border-t-4 border-t-emerald-600 shadow-sm">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Produit : {souscription.donnees_produit?.produit || "Non spécifié"}
                </CardTitle>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                  {souscription.reference}
                </Badge>
              </div>
              <CardDescription>
                Détails de la simulation associée et des primes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Key Financials Highlight */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-medium mb-1">Prime Nette Annuelle</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(souscription.donnees_produit?.prime_nette_annuelle)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium mb-1">Capital Garanti</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(souscription.donnees_produit?.capital_garanti)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-sm text-purple-600 font-medium mb-1">Prime Totale</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(souscription.donnees_produit?.prime_totale)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-gray-500" />
                    Paramètres de calcul
                  </h4>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
                    <DetailRow label="Âge pris en compte" value={`${souscription.donnees_produit?.age_parent || "-"} ans`} />
                    <DetailRow label="Durée de la rente" value={`${souscription.donnees_produit?.duree_rente || "-"} ans`} />
                    <DetailRow label="Tranche d'âge" value={souscription.donnees_produit?.tranche_age} />
                    <DetailRow label="Rente annuelle" value={formatCurrency(souscription.donnees_produit?.rente_annuelle)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Détails du contrat
                  </h4>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
                    <DetailRow label="Date d'effet" value={safeFormatDate(souscription.date_effet_contrat)} />
                    <DetailRow label="Date d'échéance" value={safeFormatDate(souscription.date_echeance_contrat)} />
                    <DetailRow label="Numéro de police" value={souscription.numero_police || "En attente"} isMono />
                    <DetailRow
                      label="Documents fournis"
                      value={
                        Array.isArray(souscription.documents)
                          ? souscription.documents.join(', ')
                          : typeof souscription.documents === 'string'
                            ? souscription.documents.split(',').map(d => d.trim()).join(', ')
                            : "Aucun"
                      }
                    />
                  </div>
                </div>
              </div>

              {souscription.donnees_produit?.details_calcul && (
                <div className="mt-6 pt-6 border-t border-dashed">
                  <p className="text-xs text-gray-400 font-mono mb-2 uppercase tracking-wide">Logique de calcul</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-900 text-slate-300 p-4 rounded-md">
                    {Object.entries(souscription.donnees_produit.details_calcul).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-slate-500 mb-1">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejection/Validation Info if exists */}
          {(souscription.motif_rejet || souscription.statut === 'rejetee') && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-700 text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Motif du rejet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-800">{souscription.motif_rejet || souscription.raison_rejet || "Aucun motif spécifié."}</p>
                {souscription.date_rejet && (
                  <p className="text-xs text-red-600 mt-2">Rejeté le {safeFormatDate(souscription.date_rejet, "dd MMMM yyyy 'à' HH:mm")}</p>
                )}
              </CardContent>
            </Card>
          )}

          {souscription.statut === 'validee' && souscription.date_validation && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-800">
                  <ShieldCheck className="h-6 w-6" />
                  <div>
                    <h4 className="font-semibold">Souscription validée</h4>
                    <p className="text-sm text-green-700">Validée le {safeFormatDate(souscription.date_validation, "dd MMMM yyyy 'à' HH:mm")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {souscription && (
        <>
          <ValidateSouscriptionDialog
            open={validateDialogOpen}
            onOpenChange={setValidateDialogOpen}
            souscription={souscription}
            onValidate={handleValidate}
          />
          <RejectSouscriptionDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            souscription={souscription}
            onReject={handleReject}
          />
        </>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, isMono = false }: { icon: any, label: string, value?: string | null, isMono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm text-gray-900 mt-0.5 ${isMono ? 'font-mono' : ''} ${!value ? 'text-gray-400 italic' : ''}`}>
          {value || "Non renseigné"}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, isMono = false }: { label: string, value?: string | number | null, isMono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${isMono ? 'font-mono' : ''}`}>{value || "-"}</span>
    </div>
  );
}

