"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Simulation, QuestionnaireResponse } from "@/types";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { normalizeProductKey } from "@/lib/utils/productLabels";
import { STATUT_LABELS } from "@/lib/utils/constants";
import { formatDateShort, formatDateFull } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/format";
import {
  Download, CheckCircle, Edit
} from "lucide-react";
import { questionnairesApi, exportsApi } from "@/lib/api/simulations";
import toast from "react-hot-toast";

interface SimulationViewDialogProps {
  simulation: Simulation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (simulation: Simulation) => void;
}

/* ─── Helper Components ──────────────────────────────────── */

function DesignSquare({ className = "text-[#E2B659]" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center mr-1.5 border border-current rounded-[2px] w-3 h-3 flex-shrink-0 align-middle ${className}`}
      style={{ borderWidth: "1.5px" }}
    >
      <span className="sr-only">■</span>
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export function SimulationViewDialog({
  simulation,
  open,
  onOpenChange,
  onEdit,
}: SimulationViewDialogProps) {
  const router = useRouter();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const { getLabel } = useProductLabels();
  const { validateSimulation } = useSimulationStore();

  useEffect(() => {
    if (open && simulation) {
      const fetchQuestionnaire = async () => {
        try {
          const data = await questionnairesApi.getQuestionnaires(simulation.id);
          if (data && data.length > 0) {
            setQuestionnaire(data[0]);
          } else {
            setQuestionnaire(null);
          }
        } catch (error) {
          console.error("Failed to fetch questionnaire", error);
        }
      };
      fetchQuestionnaire();
    }
  }, [open, simulation]);

  // Merged data structure
  const s = useMemo(() => {
    if (!simulation) return null;
    const donnees = simulation.donnees_entree || {};
    const resultats = simulation.resultats_calcul || {};
    return {
      ...simulation,
      ...donnees,
      ...resultats,
      produit: simulation.produit,
      date_naissance: simulation.date_naissance || (donnees as any).date_naissance || resultats.date_naissance,
      adresse: (donnees as any).adresse || simulation.adresse_postale,
      profession: (donnees as any).profession || simulation.profession,
      employeur: (donnees as any).employeur || simulation.employeur,
      numero_compte: (donnees as any).numero_compte || simulation.numero_compte,
      situation_matrimoniale: (donnees as any).situation_matrimoniale || simulation.situation_matrimoniale,
      date_effet: (donnees as any).date_effet || simulation.date_effet || resultats.date_effet,
      age_parent: (donnees as any).age_parent || resultats.age_parent,
      age_enfant: (donnees as any).age_enfant || resultats.age_enfant,
      age: (donnees as any).age || resultats.age,
      duree_rente: (donnees as any).duree_rente || resultats.duree_rente,
      tranche_age: resultats.tranche_age || (donnees as any).tranche_age,
      rente_annuelle: (donnees as any).rente_annuelle || resultats.rente_annuelle,
      capital_dtc_iad: resultats.capital_dtc_iad || (donnees as any).capital_dtc_iad,
      montant_rente: (donnees as any).montant_rente || resultats.montant_rente,
      duree_paiement: (donnees as any).duree_paiement || resultats.duree_paiement,
      duree_service: (donnees as any).duree_service || resultats.duree_service,
      montant_pret: (donnees as any).montant_pret || resultats.montant_pret || simulation.montant_pret,
      duree_mois: (donnees as any).duree_mois || resultats.duree_mois || simulation.duree_mois,
      prime_mensuelle: (donnees as any).prime_mensuelle || resultats.prime_mensuelle || simulation.prime_mensuelle,
      prime_periodique_commerciale: resultats.prime_periodique_commerciale,
      prime_periodique_saisie: (donnees as any).prime_periodique_commerciale,
      nombre_periodes: resultats.nombre_periodes,
      cumul_cotisations: (resultats as any).cumul_cotisations,
      interets_totaux: (resultats as any).interets_totaux,
      mode_calcul: (donnees as any).mode_calcul || ((resultats as any).volet ? "sur_mesure" : "forfaitaire"),
      volet: (resultats as any).volet || (donnees as any).volet,
      volet_label: (resultats as any).volet_label,
      capital_dtc: (resultats as any).capital_dtc,
      capital_total: (resultats as any).capital_total,
      frais_funeraires: (resultats as any).frais_funeraires,
      type_prime_label: (resultats as any).type_prime_label,
      duree_sur_mesure: (resultats as any).duree || (donnees as any).duree_sur_mesure,
      prime_souhaitee: (donnees as any).prime_souhaitee || (resultats as any).prime,
    } as any;
  }, [simulation]);

  const productCode = s ? normalizeProductKey(s.produit) : "";
  const donnees = simulation?.donnees_entree || {};
  const canEdit = s ? s.statut !== "convertie" : false;
  const canValidate = s ? (s.statut === "calculee" || s.statut === "brouillon") : false;
  const canExport = s ? (s.statut === "validee" || s.statut === "convertie") : false;

  const handleValidate = async () => {
    if (!s) return;
    try {
      await validateSimulation(s.id);
      toast.success("Simulation validée avec succès");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la validation");
    }
  };

  const handleExport = async () => {
    if (!s) return;
    try {
      const url = await exportsApi.previewBIA(s.id);
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Erreur lors de l'ouverture du BIA");
    }
  };

  const clientSubtitle = useMemo(() => {
    if (!s) return "";
    return [
      s.situation_matrimoniale,
      s.profession,
      s.employeur || "NSIA Banque"
    ].filter(Boolean).join(" · ");
  }, [s]);

  // Determine metric 1 and metric 2 based on product code
  const { metric1Label, metric1Value, metric1Suffix, metric2Label, metric2Value, metric2Suffix } = useMemo(() => {
    if (!s) return { metric1Label: "", metric1Value: "", metric1Suffix: "", metric2Label: "", metric2Value: "", metric2Suffix: "" };
    
    let m1Label = "MONTANT DU PRÊT";
    let m1Val = s.montant_pret ? formatCurrency(s.montant_pret).replace(" FCFA", "") : "-";
    let m1Suf = "FCFA";
    
    let m2Label = "DURÉE";
    let m2Val = s.duree_mois ? String(s.duree_mois) : "-";
    let m2Suf = "mois";

    if (productCode === "mobateli") {
      m1Label = "CAPITAL GARANTI";
      m1Val = (s.capital_total || s.capital_dtc_iad) ? formatCurrency(s.capital_total || s.capital_dtc_iad).replace(" FCFA", "") : "-";
      
      m2Label = "PRIME TOTALE";
      m2Val = s.prime_totale ? formatCurrency(s.prime_totale).replace(" FCFA", "") : "-";
      m2Suf = "FCFA";
    } else if (productCode === "elikia_scolaire") {
      m1Label = "PRIME MENSUELLE";
      m1Val = s.prime_mensuelle ? formatCurrency(s.prime_mensuelle).replace(" FCFA", "") : "-";
      
      m2Label = "DURÉE DE LA RENTE";
      m2Val = s.duree_rente ? String(s.duree_rente) : "-";
      m2Suf = "ans";
    } else if (productCode === "confort_etudes") {
      m1Label = "RENTE ANNUELLE SOUHAITÉE";
      m1Val = s.montant_rente_annuel ? formatCurrency(s.montant_rente_annuel).replace(" FCFA", "") : "-";
      
      m2Label = "DURÉE COTISATION";
      m2Val = s.duree_paiement ? String(s.duree_paiement) : "-";
      m2Suf = "ans";
    } else if (productCode === "confort_retraite") {
      m1Label = "PRIME PÉRIODIQUE SOUHAITÉE";
      m1Val = (s.prime_periodique_saisie || s.prime_periodique_commerciale) ? formatCurrency(s.prime_periodique_saisie || s.prime_periodique_commerciale).replace(" FCFA", "") : "-";
      
      m2Label = "DURÉE ENGAGEMENT";
      m2Val = s.duree ? String(s.duree) : "-";
      m2Suf = "ans";
    } else if (productCode === "epargne_plus") {
      m1Label = "COTISATION MENSUELLE";
      m1Val = (s as any).cotisation_mensuelle ? formatCurrency((s as any).cotisation_mensuelle).replace(" FCFA", "") : "-";
      
      m2Label = "DURÉE ÉPARGNE";
      m2Val = ((s as any).duree_annees || s.duree) ? String((s as any).duree_annees || s.duree) : "-";
      m2Suf = "ans";
    }

    return {
      metric1Label: m1Label,
      metric1Value: m1Val,
      metric1Suffix: m1Suf,
      metric2Label: m2Label,
      metric2Value: m2Val,
      metric2Suffix: m2Suf
    };
  }, [s, productCode]);

  // Left Column Config Items
  const configItems = useMemo(() => {
    if (!s) return [];
    const items: { label: string; value: string | number; strong?: boolean; isError?: boolean }[] = [];
    
    if (productCode === "emprunteur") {
      items.push(
        { label: "Durée du prêt", value: `${s.duree_mois || "-"} mois` },
        { label: "Taux du prêt", value: `${s.taux_interet || "-"} %` },
        { label: "Mensualité estimée", value: s.prime_mensuelle ? formatCurrency(s.prime_mensuelle) : "-", strong: true },
        { label: "Montant du prêt", value: s.montant_pret ? formatCurrency(s.montant_pret) : "-" }
      );
    } else if (productCode === "mobateli") {
      items.push(
        { label: "Mode de calcul", value: s.volet ? `Sur Mesure` : "Tarifaire" },
        { label: "Âge de l'assuré", value: `${s.age || "-"} ans` }
      );
      if (s.tranche_age) items.push({ label: "Tranche d'âge", value: s.tranche_age });
      if (!s.volet) {
        if ((donnees as any).capital_dtc_iad) items.push({ label: "Capital choisi", value: formatCurrency((donnees as any).capital_dtc_iad) });
        if ((donnees as any).duree_contrat) items.push({ label: "Durée engagement", value: `${(donnees as any).duree_contrat} an(s)` });
      }
      if (s.volet === "dtc") {
        if (s.duree_sur_mesure) items.push({ label: "Durée", value: `${s.duree_sur_mesure} an(s)` });
        if (s.type_prime_label) items.push({ label: "Type de prime", value: s.type_prime_label });
        if (s.prime_souhaitee) items.push({ label: "Prime saisie", value: formatCurrency(s.prime_souhaitee) });
      }
      if (s.volet === "dtc_ff" && s.capital_dtc !== undefined) {
        items.push({ label: "Capital DTC choisi", value: formatCurrency(s.capital_dtc) });
      }
      if (s.prime_totale) items.push({ label: "Prime Totale", value: formatCurrency(s.prime_totale), strong: true });
      if (s.prime_mensuelle) items.push({ label: "Prime Mensuelle", value: formatCurrency(s.prime_mensuelle) });
    } else if (productCode === "elikia_scolaire") {
      items.push(
        { label: "Âge du parent", value: `${s.age_parent || "-"} ans` },
        { label: "Durée de la rente", value: `${s.duree_rente || "-"} ans` },
        { label: "Tranche d'âge", value: s.tranche_age || "-" },
        { label: "Prime Mensuelle", value: s.prime_mensuelle ? formatCurrency(s.prime_mensuelle) : "-", strong: true }
      );
    } else if (productCode === "confort_etudes") {
      items.push(
        { label: "Âge du parent", value: `${s.age_parent || "-"} ans` },
        { label: "Âge de l'enfant", value: `${s.age_enfant || "-"} ans` },
        { label: "Durée cotisation", value: `${s.duree_paiement || "-"} ans` },
        { label: "Durée service", value: `${s.duree_service || "-"} ans` },
        { label: "Prime Mensuelle", value: s.prime_mensuelle ? formatCurrency(s.prime_mensuelle) : "-", strong: true }
      );
    } else if (productCode === "confort_retraite") {
      items.push(
        { label: "Périodicité", value: s.periodicite_libelle || "-" },
        { label: "Durée", value: `${s.duree || "-"} ans` },
        { label: "Nombre de périodes", value: s.nombre_periodes || "-" },
        { label: "Prime Périodique", value: s.prime_periodique_commerciale ? formatCurrency(s.prime_periodique_commerciale) : "-", strong: true }
      );
    } else if (productCode === "epargne_plus") {
      items.push(
        { label: "Cotisation Mensuelle", value: (s as any).cotisation_mensuelle ? formatCurrency((s as any).cotisation_mensuelle) : "-", strong: true },
        { label: "Durée", value: `${(s as any).duree_annees || s.duree || "-"} ans` },
        { label: "Taux Intérêt Annuel", value: `${(s as any).taux_interet_annuel_pourcent || "-"} %` },
        { label: "Capital Acquis", value: (s as any).capital_acquis ? formatCurrency((s as any).capital_acquis) : "-" }
      );
    }
    
    if (productCode !== "emprunteur" && productCode !== "elikia_scolaire" && productCode !== "confort_etudes" && productCode !== "confort_retraite" && productCode !== "epargne_plus" && productCode !== "mobateli") {
      if (s.prime_totale) items.push({ label: "Prime Totale", value: formatCurrency(s.prime_totale), strong: true });
      if (s.prime_mensuelle) items.push({ label: "Prime Mensuelle", value: formatCurrency(s.prime_mensuelle) });
      if (s.capital_garanti) items.push({ label: "Capital Garanti", value: formatCurrency(s.capital_garanti) });
    }
    
    if ((s.surprime || 0) > 0) {
      items.push({ label: "Surprime", value: formatCurrency(s.surprime), isError: true });
    }
    
    return items;
  }, [s, productCode, donnees]);

  if (!s) return null;

  // Status Badge Colors (Light Theme Colors)
  const getStatusBadgeStyle = (statut: string) => {
    switch (statut) {
      case "brouillon":
        return "bg-amber-50 text-amber-700 border border-amber-200/80";
      case "validee":
      case "convertie":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/80";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200/80";
    }
  };

  const getStatusLabel = (statut: string) => {
    if (statut === "brouillon") return "BROUILLON";
    if (statut === "validee") return "VALIDÉE";
    if (statut === "convertie") return "CONVERTIE";
    return STATUT_LABELS[statut] || statut.toUpperCase();
  };

  const handleRedirectToQuestionnaire = () => {
    onOpenChange(false);
    router.push(`/simulations/${s.id}/questionnaire`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] w-[80vw] h-[85vh] rounded-[24px] border-0 shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-md text-slate-800 flex flex-col font-sans">
        
        {/* ═══ HEADER ═══ */}
        <DialogHeader className="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Simulation de prêt</span>
                  <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                    {s.reference}
                  </span>
                </DialogTitle>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                {getLabel(s.produit)}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusBadgeStyle(s.statut)} px-4 py-1.5 font-bold text-[10px] tracking-wider rounded shadow-sm`}>
                {getStatusLabel(s.statut)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="space-y-6 max-w-6xl mx-auto">

            {/* ─── CLIENT INFO & KEY METRICS (Target Layout) ─── */}
            <div className="bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_24px_rgb(0,0,0,0.02)] overflow-hidden">
              {/* Client Header */}
              <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-100/80">
                <div className="h-12 w-12 rounded-full bg-[#0B192C] flex items-center justify-center text-[#E2B659] font-bold text-base shadow-sm">
                  {s.prenom_client?.charAt(0) || ""}{s.nom_client?.charAt(0) || ""}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{s.prenom_client} {s.nom_client}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {clientSubtitle || "Client de la banque"}
                  </p>
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-8 py-5 border-b border-slate-100 bg-slate-50/40">
                <div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <DesignSquare className="text-slate-400" /> NÉ(E) LE
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {s.date_naissance ? formatDateShort(s.date_naissance) : "-"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <DesignSquare className="text-slate-400" /> TÉLÉPHONE
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{s.telephone_client || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <DesignSquare className="text-slate-400" /> ADRESSE
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.adresse || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <DesignSquare className="text-slate-400" /> COMPTE BANCAIRE
                  </div>
                  <p className="text-sm font-mono font-semibold text-slate-800">{s.numero_compte || "-"}</p>
                </div>
              </div>

              {/* Key Loan summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
                <div className="px-8 py-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{metric1Label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{metric1Value}</span>
                    {metric1Suffix && <span className="text-xs font-bold text-slate-500">{metric1Suffix}</span>}
                  </div>
                </div>
                <div className="px-8 py-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{metric2Label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{metric2Value}</span>
                    {metric2Suffix && <span className="text-xs font-bold text-slate-500">{metric2Suffix}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── BOTTOM: Two Columns (Configuration | Risk & Medical) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ══ LEFT: Configuration ══ */}
              <div className="space-y-6">
                <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center">
                    <DesignSquare className="text-blue-600" /> CONFIGURATION
                  </h4>
                  
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden px-4 bg-slate-50/20">
                    {configItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3">
                        <span className="text-slate-500 text-xs">{item.label}</span>
                        <span
                          className={`font-semibold text-sm ${
                            item.strong ? "text-base font-bold text-[#0B192C]" : "text-slate-800"
                          } ${item.isError ? "text-red-600" : ""}`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bénéficiaires */}
                {s.beneficiaires && s.beneficiaires.length > 0 && (
                  <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center">
                      <DesignSquare className="text-blue-600" /> BÉNÉFICIAIRES
                    </h4>
                    <div className="space-y-2.5">
                      {s.beneficiaires.map((ben: any, index: number) => (
                        <div key={ben.id || index} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                              {ben.ordre}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-slate-800">{ben.nom_prenoms}</p>
                              <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                                {ben.qualite_display || (ben.qualite === "enfant_a_naitre" ? "Enfant né ou à naitre" : ben.qualite)}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700">
                            {ben.part_pourcentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ══ RIGHT: Risk & Medical ══ */}
              <div className="space-y-6">
                
                {/* Risk Category section */}
                <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center">
                    <DesignSquare className="text-blue-600" /> ÉVALUATION DES RISQUES
                  </h4>

                  {/* Yellowish Box as Target Design */}
                  <div className="bg-[#FFFDF5] border border-[#FEF3C7] rounded-xl p-5 shadow-sm mb-5 text-[#92400E]">
                    <p className="text-[9px] uppercase font-bold text-[#D97706] tracking-wider mb-2">CATÉGORIE DE RISQUE</p>
                    <div className="flex items-center text-base font-bold">
                      <DesignSquare className="text-[#D97706] h-3.5 w-3.5" />
                      {s.categorie_risque || "Standard"}
                    </div>
                  </div>

                  {/* Questionnaire Box */}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center">
                    <DesignSquare className="text-blue-600" /> QUESTIONNAIRE MÉDICAL
                  </h4>

                  {!questionnaire ? (
                    <div className="bg-slate-50/80 border border-slate-100 border-dashed rounded-xl p-6 flex flex-col items-start">
                      <p className="text-xs text-slate-500">Non renseigné</p>
                      <Button
                        variant="outline"
                        onClick={handleRedirectToQuestionnaire}
                        className="mt-4 border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 h-9 rounded-lg px-4 text-xs font-semibold"
                      >
                        <DesignSquare className="text-slate-400" /> Compléter
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-slate-100 bg-slate-50/20 rounded-xl p-5 space-y-4">
                      {/* Physical Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-100">
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Taille / Poids</p>
                          <p className="font-bold text-slate-800">{questionnaire.taille_cm} cm / {questionnaire.poids_kg} kg</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100">
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">IMC / Tension</p>
                          <p className="font-bold text-slate-800">
                            {(Number(questionnaire.poids_kg) / Math.pow(Number(questionnaire.taille_cm) / 100, 2)).toFixed(1)} / {questionnaire.tension_arterielle || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Lifestyle habits */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${questionnaire.fumeur ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                          {questionnaire.fumeur ? `Fumeur (${questionnaire.nb_cigarettes_jour} cig/j)` : "Non Fumeur"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${questionnaire.consomme_alcool ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                          {questionnaire.consomme_alcool ? "Consomme alcool" : "Sans alcool"}
                        </span>
                        {questionnaire.pratique_sport && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            Sport ({questionnaire.type_sport})
                          </span>
                        )}
                      </div>

                      {/* Specific Medical Alerts */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Antécédents signalés</p>
                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-white">
                          {[
                            { label: "Infirmité", value: questionnaire.a_infirmite },
                            { label: "Malade (6 derniers mois)", value: questionnaire.malade_6_derniers_mois },
                            { label: "Fatigue fréquente", value: questionnaire.souvent_fatigue },
                            { label: "Perte de poids récente", value: questionnaire.perte_poids_recente },
                            { label: "Prise de poids récente", value: questionnaire.prise_poids_recente },
                            { label: "Ganglions", value: questionnaire.a_ganglions },
                            { label: "Fièvre persistante", value: questionnaire.fievre_persistante },
                            { label: "Plaies buccales", value: questionnaire.plaies_buccales },
                            { label: "Diarrhée fréquente", value: questionnaire.diarrhee_frequente },
                            { label: "Ballonnement", value: questionnaire.ballonnement },
                            { label: "Œdèmes", value: questionnaire.oedemes_membres_inferieurs },
                            { label: "Essoufflement", value: questionnaire.essoufflement },
                            { label: "Perfusion", value: questionnaire.a_eu_perfusion },
                            { label: "Transfusion", value: questionnaire.a_eu_transfusion },
                            { label: "Hypertendu", value: questionnaire.est_hypertendu },
                            { label: "Diabétique", value: questionnaire.est_diabetique },
                          ].filter(item => item.value === true).map((item) => (
                            <div key={item.label} className="flex items-center justify-between px-3 py-2 text-xs bg-red-50/20">
                              <span className="text-slate-700">{item.label}</span>
                              <Badge className="bg-red-100 text-red-700 border border-red-200/50 rounded text-[9px] font-bold px-2 py-0">
                                Oui
                              </Badge>
                            </div>
                          ))}
                          {[
                            { label: "Infirmité", value: questionnaire.a_infirmite },
                            { label: "Malade (6 derniers mois)", value: questionnaire.malade_6_derniers_mois },
                            { label: "Fatigue fréquente", value: questionnaire.souvent_fatigue },
                            { label: "Perte de poids récente", value: questionnaire.perte_poids_recente },
                            { label: "Prise de poids récente", value: questionnaire.prise_poids_recente },
                            { label: "Ganglions", value: questionnaire.a_ganglions },
                            { label: "Fièvre persistante", value: questionnaire.fievre_persistante },
                            { label: "Plaies buccales", value: questionnaire.plaies_buccales },
                            { label: "Diarrhée fréquente", value: questionnaire.diarrhee_frequente },
                            { label: "Ballonnement", value: questionnaire.ballonnement },
                            { label: "Œdèmes", value: questionnaire.oedemes_membres_inferieurs },
                            { label: "Essoufflement", value: questionnaire.essoufflement },
                            { label: "Perfusion", value: questionnaire.a_eu_perfusion },
                            { label: "Transfusion", value: questionnaire.a_eu_transfusion },
                            { label: "Hypertendu", value: questionnaire.est_hypertendu },
                            { label: "Diabétique", value: questionnaire.est_diabetique },
                          ].filter(item => item.value === true).length === 0 && (
                            <div className="px-3 py-3 text-center text-slate-400 italic text-xs">
                              Aucun antécédent signalé
                            </div>
                          )}
                        </div>
                      </div>

                      {questionnaire.infos_complementaires && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700">
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Informations complémentaires</p>
                          <p className="whitespace-pre-wrap text-slate-600">{questionnaire.infos_complementaires}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══ FOOTER ACTIONS (Always visible) ═══ */}
        <DialogFooter className="px-8 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2 flex-shrink-0">
          <div className="flex gap-x-6 text-[10px] text-slate-400">
            <div>
              <DesignSquare className="text-slate-400" /> Créé le {s.created_at ? formatDateShort(s.created_at) : "-"}
            </div>
            <div>
              <DesignSquare className="text-slate-400" /> Modifié le {s.updated_at ? formatDateShort(s.updated_at) : "-"}
            </div>
          </div>

          <div className="flex gap-2">
            {canExport && (
              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                className="rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50 h-10 px-4 text-xs font-semibold"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exporter
              </Button>
            )}
            {canEdit && onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(s);
                }}
                className="rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50 h-10 px-4 text-xs font-semibold"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
            {canValidate && (
              <Button
                type="button"
                onClick={handleValidate}
                className="rounded-lg bg-[#0B192C] text-[#E2B659] border border-[#0B192C] hover:opacity-90 shadow-md font-bold h-10 px-4 text-xs"
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Soumettre le dossier
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
