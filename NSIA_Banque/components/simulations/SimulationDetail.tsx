"use client";

import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimulationActions } from "@/components/simulations/SimulationActions";
import { exportsApi, questionnairesApi } from "@/lib/api/simulations";
import {
  STATUT_LABELS,
  STATUT_COLORS,
} from "@/lib/utils/constants";
import { PRODUIT_LABELS, type ProduitType, type QuestionnaireResponse } from "@/types";
import { type SimulationResponse } from "@/src/domain/api/SimulationResponse";
import { useProductLabels } from "@/lib/hooks/useProductLabels";
import { normalizeProductKey } from "@/lib/utils/productLabels";
import { formatDateFull, formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/format";
import { useState, useEffect } from "react";
import {
  FileText,
  User as UserIcon,
  Phone,
  Mail,
  Briefcase,
  Building2,
  CreditCard,
  Calendar,
  MapPin,
  Calculator,
  Activity,
  HeartPulse,
  Banknote,
  Clock,
  Users,
  AlertCircle,
  Cigarette,
  Wine,
  Ruler,
  Scale,
  CheckCircle,
  TrendingUp,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface SimulationDetailProps {
  simulation: SimulationResponse;
}

// ─── Shared Design Primitives ───────────────────────────────────────────────

function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`
        relative rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm
        shadow-[0_4px_24px_-4px_rgba(99,102,241,0.08)]
        hover:shadow-[0_8px_32px_-4px_rgba(99,102,241,0.14)]
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  accent = "indigo",
  extra,
}: {
  icon: any;
  title: string;
  accent?: "indigo" | "violet" | "purple" | "amber" | "emerald" | "fuchsia";
  extra?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-600",
    violet: "bg-violet-100 text-violet-600",
    purple: "bg-purple-100 text-purple-600",
    amber:  "bg-amber-100  text-amber-600",
    emerald:"bg-emerald-100 text-emerald-600",
    fuchsia:"bg-fuchsia-100 text-fuchsia-600",
  };
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/80">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}

function KpiChip({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "primary" | "success" | "accent";
}) {
  const variants: Record<string, string> = {
    default: "bg-gray-50 border-gray-200 text-gray-900",
    primary: "bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent shadow-lg shadow-indigo-900/20",
    success: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-900/15",
    accent:  "bg-indigo-50 border-indigo-200 text-indigo-900",
  };
  return (
    <div className={`rounded-xl border p-4 ${variants[variant]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${variant === "primary" || variant === "success" ? "text-white/70" : "text-gray-500"}`}>
        {label}
      </p>
      <p className={`text-xl font-bold leading-tight ${variant === "primary" || variant === "success" ? "text-white" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function DataRow({
  label,
  value,
  strong = false,
  isError = false,
  className = "",
}: {
  label: string;
  value?: string | number;
  strong?: boolean;
  isError?: boolean;
  className?: string;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={`flex justify-between items-center py-2.5 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${className}`}>
      <span className="text-gray-500 text-sm">{label}</span>
      <span
        className={`text-sm font-medium ${isError ? "text-red-600" : strong ? "text-gray-900 font-semibold" : "text-gray-700"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function ClientInfoItem({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="mt-0.5 text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm text-gray-800 font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SimulationDetail({ simulation }: SimulationDetailProps) {
  const router = useSafeRouter();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const { getLabel } = useProductLabels();

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const data = await questionnairesApi.getQuestionnaires(simulation.id);
        if (data && data.length > 0) {
          setQuestionnaire(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch questionnaire", error);
      }
    };
    fetchQuestionnaire();
  }, [simulation.id]);

  const donnees = simulation.donnees_entree || {};
  const resultats = simulation.resultats_calcul || {};

  const s = {
    ...simulation as any,
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
    mode_calcul: (donnees as any).mode_calcul || ((resultats as any).volet ? 'sur_mesure' : 'forfaitaire'),
    volet: (resultats as any).volet || (donnees as any).volet,
    volet_label: (resultats as any).volet_label,
    capital_dtc: (resultats as any).capital_dtc,
    capital_total: (resultats as any).capital_total,
    frais_funeraires: (resultats as any).frais_funeraires,
    type_prime_label: (resultats as any).type_prime_label,
    duree_sur_mesure: (resultats as any).duree || (donnees as any).duree_sur_mesure,
    prime_souhaitee: (donnees as any).prime_souhaitee || (resultats as any).prime,
  };

  const productCode = normalizeProductKey(s.produit);
  const getProductDisplayName = (produit: string | undefined) =>
    getLabel(produit || "") || "Produit Inconnu";

  const initials = `${s.prenom_client?.charAt(0) || ""}${s.nom_client?.charAt(0) || ""}`;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">

      {/* ── Header Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-700 tracking-tight">
            <span className="text-gray-400 font-normal mr-1.5">Réf.</span>
            {s.reference}
          </h2>
          <Badge
            className={`${STATUT_COLORS[s.statut]} px-3 py-1 text-xs font-semibold rounded-full`}
          >
            {STATUT_LABELS[s.statut]}
          </Badge>
        </div>
        <SimulationActions simulation={simulation} />
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─ Left Column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Profil Client */}
          <PremiumCard>
            <SectionHeader icon={UserIcon} title="Profil Client" accent="indigo" />
            <div className="p-6 space-y-5">
              {/* Avatar block */}
              <div className="flex flex-col items-center text-center gap-3 pb-5 border-b border-gray-100">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/30 select-none">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center shadow-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {s.prenom_client} {s.nom_client}
                  </h3>
                  {s.situation_matrimoniale && (
                    <span className="mt-1.5 inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                      {s.situation_matrimoniale}
                    </span>
                  )}
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-1">
                <ClientInfoItem icon={Calendar}  label="Né(e) le"       value={s.date_naissance ? formatDateFull(s.date_naissance) : undefined} />
                <ClientInfoItem icon={Phone}     label="Téléphone"      value={s.telephone_client} />
                <ClientInfoItem icon={Mail}      label="Email"          value={s.email_client} />
                <ClientInfoItem icon={MapPin}    label="Adresse"        value={s.adresse} />
                <ClientInfoItem icon={Briefcase} label="Profession"     value={s.profession} />
                <ClientInfoItem icon={Building2} label="Employeur"      value={s.employeur} />
                <ClientInfoItem icon={CreditCard} label="Compte bancaire" value={s.numero_compte} mono />
              </div>
            </div>
          </PremiumCard>

          {/* Historique */}
          <PremiumCard>
            <SectionHeader icon={Clock} title="Historique" accent="indigo" />
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between items-center px-6 py-3.5">
                <span className="text-sm text-gray-500">Création</span>
                <span className="text-sm font-medium text-gray-800">{formatDateFull(s.created_at)}</span>
              </div>
              <div className="flex justify-between items-center px-6 py-3.5">
                <span className="text-sm text-gray-500">Mise à jour</span>
                <span className="text-sm font-medium text-gray-800">{formatDateFull(simulation.updated_at)}</span>
              </div>
            </div>
          </PremiumCard>

        </div>

        {/* ─ Right Column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Product Hero Card */}
          <PremiumCard>
            {/* Header with dark gradient */}
            <div className="rounded-t-2xl bg-gradient-to-r from-indigo-900 via-violet-900 to-indigo-800 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Produit</p>
                    <h4 className="text-white font-bold text-lg leading-tight">
                      {getProductDisplayName(s.produit)}
                    </h4>
                  </div>
                </div>
                {s.date_effet && (
                  <div className="text-right shrink-0">
                    <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Date d'effet</p>
                    <p className="text-white font-semibold text-sm">{formatDateFull(s.date_effet || s.donnees_entree?.date_effet)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Chips */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {s.prime_totale && s.produit !== 'elikia_scolaire' && (
                  <KpiChip label="Prime Totale" value={`${formatCurrency(s.prime_totale)} FCFA`} variant="primary" />
                )}
                {s.capital_garanti && (
                  <KpiChip label="Capital Garanti" value={`${formatCurrency(s.capital_garanti)} FCFA`} variant="accent" />
                )}
                {s.montant_pret && (
                  <KpiChip label="Montant du prêt" value={`${formatCurrency(s.montant_pret)} FCFA`} variant="accent" />
                )}
                {productCode === 'mobateli' && (s.capital_total || s.capital_dtc_iad) && (
                  <KpiChip
                    label={s.capital_total ? 'Capital Total (DTC+FF)' : `Capital ${getLabel('mobateli')}`}
                    value={`${formatCurrency(s.capital_total || s.capital_dtc_iad)} FCFA`}
                    variant="accent"
                  />
                )}
                {s.rente_annuelle && (
                  <KpiChip label="Rente Annuelle" value={`${formatCurrency(s.rente_annuelle)} FCFA`} variant="accent" />
                )}
                {(s.prime_unique || s.capital_unique) && s.produit === 'elikia_scolaire' && (
                  <KpiChip label="Capital Garanti" value={`${formatCurrency(s.prime_unique || s.capital_unique)} FCFA`} variant="success" />
                )}
                {productCode === 'confort_etudes' && s.montant_rente_annuel && (
                  <KpiChip label="Rente Annuelle" value={`${formatCurrency(s.montant_rente_annuel)} FCFA`} variant="accent" />
                )}
                {productCode === 'epargne_plus' && s.cumul_cotisations !== undefined && (
                  <KpiChip label="Cumul Cotisations" value={`${formatCurrency(s.cumul_cotisations)} FCFA`} variant="success" />
                )}
                {productCode === 'epargne_plus' && ((s as any).duree_annees || (s as any).duree) && (
                  <KpiChip label="Durée de contrat" value={`${(s as any).duree_annees || (s as any).duree} ans`} variant="accent" />
                )}
              </div>

              {/* Config + Financial grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Configuration */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-4 rounded-full bg-indigo-400"></div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Configuration</h5>
                  </div>
                  <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                    {productCode === "elikia_scolaire" && (
                      <>
                        <DataRow label="Âge du parent"    value={s.age_parent ? `${s.age_parent} ans` : undefined} />
                        <DataRow label="Durée de la rente" value={s.duree_rente ? `${s.duree_rente} ans` : undefined} />
                        <DataRow label="Tranche d'âge"   value={s.tranche_age} />
                      </>
                    )}
                    {productCode === "emprunteur" && (
                      <>
                        <DataRow label="Durée"       value={s.duree_mois ? `${s.duree_mois} mois` : undefined} />
                        <DataRow label="Taux du prêt" value={s.taux_interet ? `${s.taux_interet} %` : undefined} />
                      </>
                    )}
                    {productCode === "mobateli" && (
                      <>
                        <DataRow
                          label="Mode de calcul"
                          value={s.volet
                            ? `Sur Mesure — ${s.volet_label || (s.volet === 'dtc' ? 'DTC (Prime → Capital)' : 'DTC+FF (Capital → Prime)')}`
                            : 'Tarifaire'}
                        />
                        <DataRow label="Âge" value={s.age ? `${s.age} ans` : undefined} />
                        {s.tranche_age && <DataRow label="Tranche d'âge" value={s.tranche_age} />}
                        {!s.volet && (donnees as any).capital_dtc_iad && <DataRow label="Capital choisi" value={formatCurrency((donnees as any).capital_dtc_iad)} />}
                        {!s.volet && (donnees as any).duree_contrat && <DataRow label="Durée engagement" value={`${(donnees as any).duree_contrat} an(s)`} />}
                        {s.volet === 'dtc' && s.duree_sur_mesure && <DataRow label="Durée" value={`${s.duree_sur_mesure} an(s)`} />}
                        {s.volet === 'dtc' && s.type_prime_label && <DataRow label="Type de prime" value={s.type_prime_label} />}
                        {s.volet === 'dtc' && s.prime_souhaitee && <DataRow label="Prime saisie" value={formatCurrency(s.prime_souhaitee)} />}
                        {s.volet === 'dtc_ff' && s.capital_dtc !== undefined && <DataRow label="Capital DTC choisi" value={formatCurrency(s.capital_dtc)} />}
                      </>
                    )}
                    {productCode === "confort_etudes" && (
                      <>
                        <DataRow label="Âge du parent"      value={s.age_parent ? `${s.age_parent} ans` : undefined} />
                        <DataRow label="Âge de l'enfant"    value={s.age_enfant ? `${s.age_enfant} ans` : undefined} />
                        <DataRow label="Durée cotisation"   value={s.duree_paiement ? `${s.duree_paiement} ans` : undefined} />
                        <DataRow label="Durée service"      value={s.duree_service ? `${s.duree_service} ans` : undefined} />
                        <DataRow label="Début service"      value={s.debut_service ? `${s.debut_service} ans` : undefined} />
                        <DataRow label="Fin service"        value={s.fin_service ? `${s.fin_service} ans` : undefined} />
                      </>
                    )}
                    {productCode === "confort_retraite" && (
                      <>
                        <DataRow label="Périodicité"      value={s.periodicite_libelle} />
                        <DataRow label="Durée"            value={s.duree ? `${s.duree} ans` : undefined} />
                        <DataRow label="Nombre de périodes" value={s.nombre_periodes} />
                      </>
                    )}
                    {productCode === "epargne_plus" && (
                      <>
                        <DataRow label="Cotisation Mensuelle"      value={formatCurrency((s as any).cotisation_mensuelle)} strong />
                        <DataRow label="Durée"                     value={(s as any).duree_annees || s.duree ? `${(s as any).duree_annees || s.duree} ans` : undefined} />
                        <DataRow label="Taux Intérêt Annuel"       value={(s as any).taux_interet_annuel_pourcent ? `${(s as any).taux_interet_annuel_pourcent} %` : undefined} />
                        <DataRow label="Frais de Gestion"          value={(s as any).taux_frais_gestion_pourcent ? `${(s as any).taux_frais_gestion_pourcent} %` : undefined} />
                        <DataRow label="Frais d'Acquisition"       value={(s as any).taux_frais_acquisition_pourcent ? `${(s as any).taux_frais_acquisition_pourcent} %` : undefined} />
                        {(s as any).taux_penalite_rachat_pourcent > 0 && (
                          <DataRow label="Pénalité Rachat (si < 10 ans)" value={`${(s as any).taux_penalite_rachat_pourcent} %`} isError />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Détails Financiers */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-4 rounded-full bg-emerald-400"></div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Détails Financiers</h5>
                  </div>
                  <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                    {s.montant_pret && <DataRow label="Montant du prêt" value={formatCurrency(s.montant_pret)} />}
                    {s.date_premiere_echeance && <DataRow label="Date 1ère échéance" value={formatDateFull(s.date_premiere_echeance)} />}
                    {s.duree_mois && <DataRow label="Durée remboursement" value={`${s.duree_mois} mois`} />}
                    {s.prime_nette && productCode !== 'mobateli' && <DataRow label="Prime nette" value={formatCurrency(s.prime_nette)} />}
                    {s.frais_accessoires && productCode && !['confort_retraite', 'epargne_plus', 'elikia_scolaire', 'mobateli'].includes(productCode) && (
                      <DataRow label="Frais d'accessoires" value={formatCurrency(s.frais_accessoires)} />
                    )}

                    {/* Mobateli */}
                    {productCode === 'mobateli' && (
                      <>
                        {!s.volet && (
                          <>
                            {s.capital_dtc_iad && <DataRow label="Capital DTC/IAD" value={formatCurrency(s.capital_dtc_iad)} strong />}
                            {s.prime_nette && <DataRow label="Prime Nette" value={formatCurrency(s.prime_nette)} />}
                            {s.prime_mensuelle && <DataRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} />}
                            {s.frais_accessoires && <DataRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DataRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                        {s.volet === 'dtc' && (
                          <>
                            {(resultats as any).capital_dtc_iad && <DataRow label="Capital DTC/IAD (calculé)" value={formatCurrency((resultats as any).capital_dtc_iad)} strong />}
                            {(resultats as any).prime && <DataRow label="Prime" value={formatCurrency((resultats as any).prime)} />}
                            {s.frais_accessoires && <DataRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DataRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                        {s.volet === 'dtc_ff' && (
                          <>
                            {s.capital_total && <DataRow label="Capital Total (DTC+FF)" value={formatCurrency(s.capital_total)} strong />}
                            {s.capital_dtc !== undefined && <DataRow label="Capital DTC" value={formatCurrency(s.capital_dtc)} />}
                            {s.frais_funeraires && <DataRow label="Frais Funéraires" value={formatCurrency(s.frais_funeraires.total)} />}
                            {(resultats as any).prime && <DataRow label="Prime" value={formatCurrency((resultats as any).prime)} />}
                            {s.frais_accessoires && <DataRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DataRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                      </>
                    )}

                    {/* Elikia */}
                    {productCode === 'elikia_scolaire' && (
                      <>
                        {s.prime_nette_annuelle && <DataRow label="Prime Nette Annuelle" value={formatCurrency(s.prime_nette_annuelle)} />}
                        {s.prime_mensuelle && <DataRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} />}
                        {s.frais_accessoires && <DataRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                      </>
                    )}

                    {/* Others */}
                    {productCode !== 'mobateli' && productCode !== 'elikia_scolaire' && (
                      <>
                        {s.prime_mensuelle && <DataRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} strong />}
                        {s.prime_annuelle && <DataRow label="Prime annuelle" value={formatCurrency(s.prime_annuelle)} />}
                      </>
                    )}

                    {s.prime_nette_annuelle && productCode !== 'elikia_scolaire' && <DataRow label="Prime Nette Annuelle" value={formatCurrency(s.prime_nette_annuelle)} />}
                    {(s.surprime || 0) > 0 && <DataRow label="Surprime" value={formatCurrency(s.surprime)} isError />}
                    {s.capital_deces && <DataRow label="Capital Décès" value={formatCurrency(s.capital_deces)} />}

                    {productCode === 'confort_retraite' && (
                      <>
                        <DataRow label="Prime Epargne" value={formatCurrency(s.prime_epargne)} />
                        <DataRow label="Prime Décès" value={formatCurrency(s.prime_deces)} />
                        {s.prime_periodique_saisie && <DataRow label="Prime Périodique" value={formatCurrency(s.prime_periodique_saisie)} />}
                        {s.frais_accessoires && <DataRow label="Frais d'accessoires" value={formatCurrency(s.frais_accessoires)} />}
                        {s.prime_periodique_commerciale && <DataRow label="Prime périodique commerciale" value={formatCurrency(s.prime_periodique_commerciale)} strong />}
                      </>
                    )}

                    {productCode === 'epargne_plus' && (
                      <>
                        <DataRow label="Capital Acquis"              value={formatCurrency((s as any).capital_acquis)} />
                        <DataRow label="Cumul Cotisations"           value={formatCurrency((s as any).cumul_cotisations)} />
                        <DataRow label="Intérêts Totaux"             value={formatCurrency((s as any).interets_totaux)} />
                        <DataRow label="Frais d'adhésion"            value={formatCurrency((s as any).frais_adhesion)} />
                        <DataRow label="Capital Net (après pénalité)" value={formatCurrency((s as any).capital_apres_penalite)} strong />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Evolution Mensuelle (Epargne Plus) */}
          {productCode === 'epargne_plus' && (s.resultats_calcul?.evolution_mensuelle || (s as any).evolution_mensuelle) && (
            <PremiumCard>
              {(() => {
                const evolution = s.resultats_calcul?.evolution_mensuelle || (s as any).evolution_mensuelle;
                if (!Array.isArray(evolution) || evolution.length === 0) return null;
                return (
                  <>
                    <SectionHeader
                      icon={TrendingUp}
                      title="Évolution Mensuelle de l'Épargne"
                      accent="emerald"
                      extra={
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          {evolution.length} mois
                        </span>
                      }
                    />
                    <div className="overflow-x-auto max-h-96 rounded-b-2xl">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-center w-16">Mois</th>
                            <th className="px-4 py-3 text-right">Prime Brute</th>
                            <th className="px-4 py-3 text-right">Cumul Primes</th>
                            <th className="px-4 py-3 text-right">Mnt Investi</th>
                            <th className="px-4 py-3 text-right">Intérêts</th>
                            <th className="px-4 py-3 text-right font-bold text-emerald-600">Capital Fin</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                          {evolution.map((row: any) => (
                            <tr key={row.mois} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-2.5 text-center font-medium text-gray-900 border-r border-gray-50">{row.mois}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(row.prime_brute)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{formatCurrency(row.cumul_primes)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(row.prime_nette)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-600">+{formatCurrency(row.interet_cumul)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(row.capital_fin)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </PremiumCard>
          )}

          {/* Bénéficiaires */}
          {s.beneficiaires && s.beneficiaires.length > 0 && (
            <PremiumCard>
              <SectionHeader icon={Users} title={`Bénéficiaires (${s.beneficiaires.length})`} accent="purple" />
              <div className="p-5 space-y-3">
                {s.beneficiaires.map((ben: any, index: number) => (
                  <div
                    key={ben.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {ben.ordre}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{ben.nom_prenoms}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {ben.qualite_display || (ben.qualite === "enfant_a_naitre" ? "Enfant né ou à naître" : ben.qualite)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                      {ben.part_pourcentage}%
                    </span>
                  </div>
                ))}

                {s.total_parts_beneficiaires !== undefined && (
                  <div className="flex justify-between items-center pt-3 border-t border-purple-100 px-1">
                    <span className="text-sm font-medium text-gray-500">Total des parts</span>
                    <span className={`text-base font-bold ${s.total_parts_beneficiaires === 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {s.total_parts_beneficiaires}%
                    </span>
                  </div>
                )}
                {s.beneficiaires_valides && (
                  <div className={`mt-1 p-3 rounded-lg ${s.beneficiaires_valides.is_valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-orange-50 border border-orange-200'}`}>
                    <p className={`text-sm font-medium ${s.beneficiaires_valides.is_valid ? 'text-emerald-700' : 'text-orange-600'}`}>
                      {s.beneficiaires_valides.message}
                    </p>
                  </div>
                )}
              </div>
            </PremiumCard>
          )}

          {/* Données Médicales */}
          {(questionnaire || ["brouillon", "calculee"].includes(s.statut) || s.categorie_risque || s.taux_surprime !== undefined) && (
            <PremiumCard>
              <SectionHeader icon={HeartPulse} title="Données Médicales" accent="amber" />
              <div className="p-5 space-y-5">

                {/* Risk summary bar */}
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-5 bg-amber-50/60 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Activity className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-0.5">Risque</p>
                      <p className="text-base font-bold text-amber-900">{s.categorie_risque || "Standard"}</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-amber-200 hidden sm:block" />
                  {s.score_total !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Score</p>
                      <p className="text-xl font-bold text-gray-700">
                        {s.score_total} <span className="text-sm font-normal text-gray-400">pts</span>
                      </p>
                    </div>
                  )}
                  {s.taux_surprime !== undefined && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Surprime</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${Number(s.taux_surprime) > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {s.taux_surprime}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Questionnaire details */}
                {questionnaire && (
                  <div className="space-y-5">
                    {/* Données Physiques */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" /> Données Physiques
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { icon: Ruler, label: "Taille", value: `${questionnaire.taille_cm} cm` },
                          { icon: Scale, label: "Poids",  value: `${questionnaire.poids_kg} kg` },
                          { icon: Activity, label: "Tension", value: questionnaire.tension_arterielle || "—" },
                          {
                            icon: Activity, label: "IMC",
                            value: (Number(questionnaire.poids_kg) / Math.pow(Number(questionnaire.taille_cm) / 100, 2)).toFixed(1),
                          },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="bg-white p-3 rounded-xl border border-amber-100/60 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1 text-gray-400">
                              <Icon className="h-3 w-3" />
                              <span className="text-[10px] uppercase tracking-wide">{label}</span>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Habitudes */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Habitudes de vie</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${questionnaire.fumeur ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          <Cigarette className="h-3 w-3" />
                          {questionnaire.fumeur ? `Fumeur (${questionnaire.nb_cigarettes_jour} cig/j)` : 'Non Fumeur'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${questionnaire.consomme_alcool ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          <Wine className="h-3 w-3" />
                          {questionnaire.consomme_alcool ? 'Consomme alcool' : 'Sans alcool'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${questionnaire.pratique_sport ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          <Activity className="h-3 w-3" />
                          {questionnaire.pratique_sport ? `Sport (${questionnaire.type_sport})` : 'Pas de sport'}
                        </span>
                      </div>
                    </div>

                    {/* Alertes */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Alertes et Antécédents
                      </p>
                      {questionnaire.infos_complementaires ? (
                        <div className="bg-white p-4 rounded-xl border border-amber-200 text-sm text-gray-700 whitespace-pre-wrap">
                          {questionnaire.infos_complementaires}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Aucun antécédent particulier signalé.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-end pt-2">
                  {["brouillon", "calculee"].includes(s.statut) && (
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm rounded-xl"
                      onClick={() => router.push(`/simulations/${s.id}/questionnaire`)}
                    >
                      <HeartPulse className="mr-2 h-4 w-4" />
                      {questionnaire ? "Modifier données médicales" : "Compléter le questionnaire"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-800 hover:bg-amber-50 rounded-xl"
                    onClick={async () => {
                      try {
                        const url = await exportsApi.previewBIA(s.id);
                        window.open(url, '_blank');
                      } catch (e) {
                        toast.error("Erreur lors de l'ouverture du BIA");
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Voir le BIA
                  </Button>
                </div>
              </div>
            </PremiumCard>
          )}

        </div>
      </div>
    </div>
  );
}
