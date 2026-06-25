"use client";

import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  Clock,
  Users,
  AlertCircle,
  Cigarette,
  Wine,
  Ruler,
  Scale
} from "lucide-react";
import toast from "react-hot-toast";

interface SimulationDetailProps {
  simulation: SimulationResponse;
}

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

  // Merge nested data for display - order matters: specific overrides general
  const donnees = simulation.donnees_entree || {};
  const resultats = simulation.resultats_calcul || {};

const s = {
    ...simulation as any,
    // Spread nested data
    ...donnees,
    ...resultats,
    // CRITICAL: preserve the original product CODE from simulation, not the display name from resultats
    produit: simulation.produit,
    // Explicitly map fields that might be in different locations
    // Client fields - fallback chain
    date_naissance: simulation.date_naissance || (donnees as any).date_naissance || resultats.date_naissance,
    adresse: (donnees as any).adresse || simulation.adresse_postale,
    profession: (donnees as any).profession || simulation.profession,
    employeur: (donnees as any).employeur || simulation.employeur,
    numero_compte: (donnees as any).numero_compte || simulation.numero_compte,
    situation_matrimoniale: (donnees as any).situation_matrimoniale || simulation.situation_matrimoniale,
    // Date d'effet - prioritize donnees_entree where user input is stored
    date_effet: (donnees as any).date_effet || simulation.date_effet || resultats.date_effet,
    // Product-specific fields from donnees_entree
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
    // Epargne Plus Specifics
    cumul_cotisations: (resultats as any).cumul_cotisations,
    interets_totaux: (resultats as any).interets_totaux,
    // Mobateli Sur Mesure Specifics
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

  // Calculate Capital Acquis for Epargne Plus if not present
  const capitalAcquis = (s as any).capital_acquis || (((s as any).cumul_cotisations || 0) + ((s as any).interets_totaux || 0));



  // Mapping normalisé des produits API vers les labels
  const getProductDisplayName = (produit: string | undefined) => {
    return getLabel(produit || "") || "Produit Inconnu";
  };

  // Normaliser le code produit pour les conditions
  const getNormalizedProductCode = (produit: string | undefined): ProduitType | null => {
    return normalizeProductKey(produit);
  };

  const productCode = getNormalizedProductCode(s.produit);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header Statut & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-muted-foreground font-normal">Réf.</span>
            {s.reference}
          </h2>
          <Badge className={`${STATUT_COLORS[s.statut]} px-3 py-1 font-medium`}>
            {STATUT_LABELS[s.statut]}
          </Badge>
        </div>
        <SimulationActions simulation={simulation} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche: Infos Client (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-l-4 border-indigo-500 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-indigo-50/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
                <UserIcon className="h-5 w-5 text-indigo-600" />
                Profil Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col items-center text-center pb-4 border-b border-indigo-100">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-3 text-indigo-700 font-bold text-3xl shadow-inner">
                  {s.prenom_client?.charAt(0)}{s.nom_client?.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{s.prenom_client} {s.nom_client}</h3>
                <Badge variant="secondary" className="mt-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  {s.situation_matrimoniale || "Non renseigné"}
                </Badge>
              </div>

              <div className="space-y-4">
                <InfoRow icon={Calendar} label="Né(e) le" value={s.date_naissance ? `${formatDateFull(s.date_naissance)}` : undefined} highlight />
                <InfoRow icon={Phone} label="Téléphone" value={s.telephone_client} />
                <InfoRow icon={Mail} label="Email" value={s.email_client} />
                <InfoRow icon={MapPin} label="Adresse" value={s.adresse} />
                <InfoRow icon={Briefcase} label="Profession" value={s.profession} />
                <InfoRow icon={Building2} label="Employeur" value={s.employeur} />
                <InfoRow icon={CreditCard} label="Compte bancaire" value={s.numero_compte} isMono />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3 bg-gray-50/50">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pt-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Création</span>
                <span className="font-medium text-gray-700">{formatDateFull(s.created_at)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Mise à jour</span>
                <span className="font-medium text-gray-700">{formatDateFull(simulation.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne Droite: Détails Produit & Résultats (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-l-4 border-violet-500 shadow-sm">
            <CardHeader className="bg-violet-50/30 border-b border-violet-100/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl text-violet-900">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Calculator className="h-6 w-6 text-violet-600" />
                  </div>
                  {getProductDisplayName(s.produit)}
                </CardTitle>
                <div className="text-right">
                  <p className="text-xs text-violet-600 font-semibold uppercase tracking-wider">Date d'effet</p>
                  <p className="font-medium text-gray-900">{formatDateFull(s.date_effet || s.donnees_entree?.date_effet)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              {/* Highlight Cards - Styled logically */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {s.prime_totale && s.produit !== 'elikia_scolaire' && (
                  <div className="bg-gradient-to-br from-violet-900 to-indigo-900 text-white p-5 rounded-xl shadow-lg shadow-indigo-900/10">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Prime Totale</p>
                      <Banknote className="h-5 w-5 text-indigo-300" />
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{formatCurrency(s.prime_totale)}</p>
                  </div>
                )}

                {s.capital_garanti && (
                  <div className="bg-white p-5 rounded-xl border border-cyan-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-16 w-16 bg-cyan-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                      <p className="text-cyan-600 text-xs font-bold uppercase tracking-wider mb-2">Capital Garanti</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(s.capital_garanti)}</p>
                    </div>
                  </div>
                )}
                {s.montant_pret && (
                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                    <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">Montant du prêt</p>
                    <p className="text-xl font-bold text-indigo-900">{formatCurrency(s.montant_pret)}</p>
                  </div>
                )}
                {productCode === 'mobateli' && (
                  <>
                    {/* Capital principal (DTC/IAD ou capital_total pour DTC+FF) */}
                    {(s.capital_total || s.capital_dtc_iad) && (
                      <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
                        <p className="text-orange-600 text-xs font-bold uppercase tracking-wider mb-2">
                          {s.capital_total ? 'Capital Total (DTC+FF)' : `Capital ${getLabel('mobateli')}`}
                        </p>
                        <p className="text-xl font-bold text-orange-900">{formatCurrency(s.capital_total || s.capital_dtc_iad)}</p>
                      </div>
                    )}
                    {/* Frais Funéraires (Sur Mesure DTC+FF) */}
                    {s.frais_funeraires && (
                      <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm">
                        <p className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">Frais Funéraires</p>
                        <p className="text-xl font-bold text-purple-900">{formatCurrency(s.frais_funeraires.total)}</p>
                      </div>
                    )}
                  </>
                )}
                {s.rente_annuelle && (
                  <div className="bg-fuchsia-50 p-5 rounded-xl border border-fuchsia-100">
                    <p className="text-fuchsia-600 text-xs font-bold uppercase tracking-wider mb-2">Rente Annuelle</p>
                    <p className="text-xl font-bold text-fuchsia-900">{formatCurrency(s.rente_annuelle)}</p>
                  </div>
                )}
                {(s.prime_unique || s.capital_unique) && s.produit === 'elikia_scolaire' && (
                  <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">Capital Garanti</p>
                    <p className="text-xl font-bold text-emerald-900">{formatCurrency(s.prime_unique || s.capital_unique)}</p>
                  </div>
                )}

                {/* Confort Etudes Highlights */}
                {productCode === 'confort_etudes' && (
                  <>
                    {s.montant_rente_annuel && (
                      <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                        <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">Montant Rente Annuelle</p>
                        <p className="text-xl font-bold text-amber-900">{formatCurrency(s.montant_rente_annuel)}</p>
                      </div>
                    )}
                  </>
                )}



                {/* Epargne Plus Highlights */}
                {productCode === 'epargne_plus' && (
                  <>



                    {s.cumul_cotisations !== undefined && (
                      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-xl shadow-lg shadow-emerald-900/10">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Cumul des Cotisations</p>
                          <Banknote className="h-5 w-5 text-emerald-200" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{formatCurrency(s.cumul_cotisations)}</p>
                      </div>
                    )}

                    {/* Durée de contrat */}
                    {((s as any).duree_annees !== undefined || (s as any).duree !== undefined) && (
                      <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200 shadow-sm">
                        <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">Durée de contrat</p>
                        <p className="text-xl font-bold text-indigo-900">{(s as any).duree_annees || (s as any).duree} ans</p>
                      </div>
                    )}

                    {/* Prime Mensuelle */}
                    {((s as any).cotisation_mensuelle !== undefined || (s as any).prime_periodique_saisie !== undefined || (s as any).prime_mensuelle !== undefined) && (
                      <div className="bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm">
                        <p className="text-violet-600 text-xs font-bold uppercase tracking-wider mb-2">Prime Mensuelle</p>
                        <p className="text-xl font-bold text-violet-900">{formatCurrency((s as any).cotisation_mensuelle || (s as any).prime_periodique_saisie || (s as any).prime_mensuelle)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                {/* Configuration (Entrées) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <div className="bg-gray-100 p-1.5 rounded-md">
                      <Calculator className="h-4 w-4 text-gray-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Configuration</h4>
                  </div>

                  <div className="space-y-0 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                    {/* ELIKIA */}
                    {productCode === "elikia_scolaire" && (
                      <>
                        <DetailRow label="Âge du parent" value={`${s.age_parent || '-'} ans`} />
                        <DetailRow label="Durée de la rente" value={`${s.duree_rente || '-'} ans`} />
                        <DetailRow label="Tranche d'âge" value={s.tranche_age || '-'} />
                      </>
                    )}
                    {/* EMPRUNTEUR */}
                    {productCode === "emprunteur" && (
                      <>

                        <DetailRow label="Durée" value={`${s.duree_mois || '-'} mois`} />
                        <DetailRow label="Taux du prêt" value={`${s.taux_interet || '-'} %`} />
                      </>
                    )}
                    {/* MOBATELI */}
                    {productCode === "mobateli" && (
                      <>
                        <DetailRow
                          label="Mode de calcul"
                          value={s.volet
                            ? `Sur Mesure — ${s.volet_label || (s.volet === 'dtc' ? 'DTC (Prime → Capital)' : 'DTC+FF (Capital → Prime)')}`
                            : 'Tarifaire'}
                        />
                        <DetailRow label="Âge" value={`${s.age || '-'} ans`} />
                        {s.tranche_age && <DetailRow label="Tranche d'âge" value={s.tranche_age} />}
                        {/* Forfaitaire: inputs */}
                        {!s.volet && (
                          <>
                            {(donnees as any).capital_dtc_iad && <DetailRow label="Capital choisi" value={formatCurrency((donnees as any).capital_dtc_iad)} />}
                            {(donnees as any).duree_contrat && <DetailRow label="Durée engagement" value={`${(donnees as any).duree_contrat} an(s)`} />}
                          </>
                        )}
                        {/* Sur Mesure DTC: input = prime → output = capital */}
                        {s.volet === 'dtc' && (
                          <>
                            {s.duree_sur_mesure && <DetailRow label="Durée" value={`${s.duree_sur_mesure} an(s)`} />}
                            {s.type_prime_label && <DetailRow label="Type de prime" value={s.type_prime_label} />}
                            {s.prime_souhaitee && <DetailRow label="Prime saisie" value={formatCurrency(s.prime_souhaitee)} />}
                          </>
                        )}
                        {/* Sur Mesure DTC+FF: input = capital → output = prime */}
                        {s.volet === 'dtc_ff' && s.capital_dtc !== undefined && (
                          <DetailRow label="Capital DTC choisi" value={formatCurrency(s.capital_dtc)} />
                        )}
                      </>
                    )}
                    {/* CONFORT ETUDES */}
                    {productCode === "confort_etudes" && (
                      <>
                        <DetailRow label="Âge du parent" value={`${s.age_parent || '-'} ans`} />
                        <DetailRow label="Âge de l'enfant" value={`${s.age_enfant || '-'} ans`} />
                        <DetailRow label="Durée cotisation" value={`${s.duree_paiement || '-'} ans`} />
                        <DetailRow label="Durée service" value={`${s.duree_service || '-'} ans`} />
                        <DetailRow label="Début service" value={`${s.debut_service || '-'} ans`} />
                        <DetailRow label="Fin service" value={`${s.fin_service || '-'} ans`} />
                      </>
                    )}
                    {/* CONFORT RETRAITE */}
                    {productCode === "confort_retraite" && (
                      <>
                        <DetailRow label="Périodicité" value={s.periodicite_libelle} />
                        <DetailRow label="Durée" value={`${s.duree || '-'} ans`} />
                        <DetailRow label="Nombre de périodes" value={s.nombre_periodes} />
                      </>
                    )}
                    {/* EPARGNE PLUS */}
                    {productCode === "epargne_plus" && (
                      <>
                        <DetailRow label="Cotisation Mensuelle" value={formatCurrency((s as any).cotisation_mensuelle)} strong />
                        <DetailRow label="Durée" value={`${(s as any).duree_annees || s.duree || '-'} ans`} />
                        <DetailRow label="Taux Intérêt Annuel" value={`${(s as any).taux_interet_annuel_pourcent || '-'} %`} />
                        <DetailRow label="Frais de Gestion" value={`${(s as any).taux_frais_gestion_pourcent || '-'} %`} />
                        <DetailRow label="Frais d'Acquisition" value={`${(s as any).taux_frais_acquisition_pourcent || '-'} %`} />
                        {(s as any).taux_penalite_rachat_pourcent > 0 && (
                          <DetailRow label="Pénalité Rachat (si < 10 ans)" value={`${(s as any).taux_penalite_rachat_pourcent} %`} isError />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Résultats Financiers */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <div className="bg-emerald-50 p-1.5 rounded-md">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Détails Financiers</h4>
                  </div>

                  <div className="space-y-0 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden bg-gray-50/30">
                    {/* Standardized Output */}
                    {s.montant_pret && <DetailRow label="Montant du prêt" value={formatCurrency(s.montant_pret)} />}

                    {s.date_premiere_echeance && <DetailRow label="Date de la première échéance" value={formatDateFull(s.date_premiere_echeance)} />}
                    {s.duree_mois && <DetailRow label="Durée de remboursement" value={`${s.duree_mois} mois`} />}

                    {s.prime_nette && productCode !== 'mobateli' && <DetailRow label="Prime nette" value={formatCurrency(s.prime_nette)} />}
                    {s.frais_accessoires && productCode && !['confort_retraite', 'epargne_plus', 'elikia_scolaire', 'mobateli'].includes(productCode) && <DetailRow label="Frais d'accessoires" value={formatCurrency(s.frais_accessoires)} />}

                    {/* Mobateli: Full Financial Details */}
                    {productCode === 'mobateli' && (
                      <>
                        {/* === FORFAITAIRE === */}
                        {!s.volet && (
                          <>
                            {s.capital_dtc_iad && <DetailRow label="Capital DTC/IAD" value={formatCurrency(s.capital_dtc_iad)} strong />}
                            {s.prime_nette && <DetailRow label="Prime Nette" value={formatCurrency(s.prime_nette)} />}
                            {s.prime_mensuelle && <DetailRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} />}
                            {s.frais_accessoires && <DetailRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DetailRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                        {/* === SUR MESURE DTC : prime → capital calculé === */}
                        {s.volet === 'dtc' && (
                          <>
                            {(resultats as any).capital_dtc_iad && (
                              <DetailRow label="Capital DTC/IAD (calculé)" value={formatCurrency((resultats as any).capital_dtc_iad)} strong />
                            )}
                            {(resultats as any).prime && <DetailRow label="Prime" value={formatCurrency((resultats as any).prime)} />}
                            {s.frais_accessoires && <DetailRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DetailRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                        {/* === SUR MESURE DTC+FF : capital → prime calculée === */}
                        {s.volet === 'dtc_ff' && (
                          <>
                            {s.capital_total && (
                              <DetailRow label="Capital Total (DTC+FF)" value={formatCurrency(s.capital_total)} strong />
                            )}
                            {s.capital_dtc !== undefined && (
                              <DetailRow label="Capital DTC" value={formatCurrency(s.capital_dtc)} />
                            )}
                            {s.frais_funeraires && (
                              <DetailRow label="Frais Funéraires" value={formatCurrency(s.frais_funeraires.total)} />
                            )}
                            {(resultats as any).prime && <DetailRow label="Prime" value={formatCurrency((resultats as any).prime)} />}
                            {s.frais_accessoires && <DetailRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                            {s.prime_totale && <DetailRow label="Prime Totale" value={formatCurrency(s.prime_totale)} strong />}
                          </>
                        )}
                      </>
                    )}

                    {/* Elikia: Full Financial Details */}
                    {productCode === 'elikia_scolaire' ? (
                      <>
                        {s.prime_nette_annuelle && <DetailRow label="Prime Nette Annuelle" value={formatCurrency(s.prime_nette_annuelle)} />}
                        {s.prime_mensuelle && <DetailRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} />}
                        {s.frais_accessoires && <DetailRow label="Frais Accessoires" value={formatCurrency(s.frais_accessoires)} />}
                      </>
                    ) : productCode !== 'mobateli' && (
                      /* Others */
                      <>
                        {s.prime_mensuelle && <DetailRow label="Prime Mensuelle" value={formatCurrency(s.prime_mensuelle)} strong />}
                        {s.prime_annuelle && <DetailRow label="Prime annuelle" value={formatCurrency(s.prime_annuelle)} />}
                      </>
                    )}

                    {s.prime_nette_annuelle && productCode !== 'elikia_scolaire' && <DetailRow label="Prime Nette Annuelle" value={formatCurrency(s.prime_nette_annuelle)} />}
                    {(s.surprime || 0) > 0 && <DetailRow label="Surprime" value={formatCurrency(s.surprime)} isError />}

                    {s.capital_deces && <DetailRow label="Capital Décès" value={formatCurrency(s.capital_deces)} />}

                    {productCode === 'confort_retraite' && (
                      <>
                        <DetailRow label="Prime Epargne" value={formatCurrency(s.prime_epargne)} />
                        <DetailRow label="Prime Décès" value={formatCurrency(s.prime_deces)} />
                        {s.prime_periodique_saisie && <DetailRow label="Prime Périodique" value={formatCurrency(s.prime_periodique_saisie)} />}
                        {s.frais_accessoires && <DetailRow label="Frais d'accessoires" value={formatCurrency(s.frais_accessoires)} />}
                        {s.prime_periodique_commerciale && <DetailRow label="Prime périodique commerciale" value={formatCurrency(s.prime_periodique_commerciale)} strong className="bg-emerald-50/50" />}
                      </>
                    )}

                    {productCode === 'epargne_plus' && (
                      <>
                        <DetailRow label="Capital Acquis" value={formatCurrency((s as any).capital_acquis)} />
                        <DetailRow label="Cumul Cotisations" value={formatCurrency((s as any).cumul_cotisations)} />
                        <DetailRow label="Intérêts Totaux" value={formatCurrency((s as any).interets_totaux)} className="text-emerald-700 bg-emerald-50/30" />
                        <DetailRow label="Frais d'adhésion" value={formatCurrency((s as any).frais_adhesion)} />
                        <DetailRow label="Capital Net (après pénalité)" value={formatCurrency((s as any).capital_apres_penalite)} strong className="bg-emerald-100/50 text-emerald-900" />
                      </>
                    )}
                  </div>


                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evolution Mensuelle Table (Epargne Plus) - Moved here between cards */}
          {productCode === 'epargne_plus' && (s.resultats_calcul?.evolution_mensuelle || (s as any).evolution_mensuelle) && (
            <Card className="border border-emerald-100 shadow-sm w-[90%] mx-auto">
              {/* Determine which array to use */}
              {(() => {
                const evolution = s.resultats_calcul?.evolution_mensuelle || (s as any).evolution_mensuelle;
                if (!Array.isArray(evolution) || evolution.length === 0) return null;

                return (
                  <>
                    <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                      <h4 className="font-semibold text-emerald-800">Evolution Mensuelle de l'Epargne</h4>
                      <span className="text-xs font-normal text-emerald-600 bg-white px-2 py-1 rounded-full border border-emerald-100">
                        {evolution.length} mois
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm border-b">
                          <tr>
                            <th scope="col" className="px-3 py-3 w-16 text-center">Mois</th>
                            <th scope="col" className="px-3 py-3 text-right">Prime Brute</th>
                            <th scope="col" className="px-3 py-3 text-right">Cumul Primes</th>
                            <th scope="col" className="px-3 py-3 text-right">Mnt Investi</th>
                            <th scope="col" className="px-3 py-3 text-right">Intérêts</th>
                            <th scope="col" className="px-3 py-3 text-right font-bold text-emerald-700">Capital Fin</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                          {evolution.map((row: any) => (
                            <tr key={row.mois} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 text-center font-medium text-gray-900 border-r">{row.mois}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.prime_brute)}</td>
                              <td className="px-3 py-2 text-right text-gray-400 text-xs">{formatCurrency(row.cumul_primes)}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.prime_nette)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600">+{formatCurrency(row.interet_cumul)}</td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(row.capital_fin)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </Card>
          )}

          {/* Bénéficiaires Section */}
          {s.beneficiaires && s.beneficiaires.length > 0 && (
            <Card className="border-l-4 border-purple-500 shadow-sm">
              <CardHeader className="bg-purple-50/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
                  <Users className="h-5 w-5 text-purple-600" />
                  Bénéficiaires ({s.beneficiaires.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {s.beneficiaires.map((ben: { id?: string | number; nom_prenoms?: string; qualite?: string; qualite_display?: string; part_pourcentage?: number; ordre?: number }, index: number) => (
                    <div key={ben.id || index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-purple-100 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {ben.ordre}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{ben.nom_prenoms}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {ben.qualite_display || (ben.qualite === "enfant_a_naitre" ? "Enfant né ou à naitre" : ben.qualite)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                          {ben.part_pourcentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {s.total_parts_beneficiaires !== undefined && (
                  <div className="mt-4 pt-4 border-t border-purple-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total des parts</span>
                    <span className={`text-lg font-bold ${s.total_parts_beneficiaires === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      {s.total_parts_beneficiaires}%
                    </span>
                  </div>
                )}
                {s.beneficiaires_valides && (
                  <div className={`mt-3 p-3 rounded-lg ${s.beneficiaires_valides.is_valid ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                    <p className={`text-sm font-medium ${s.beneficiaires_valides.is_valid ? 'text-green-700' : 'text-orange-700'}`}>
                      {s.beneficiaires_valides.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Questionnaire Médical Section */}
          {(questionnaire || ["brouillon", "calculee"].includes(s.statut) || s.categorie_risque || s.taux_surprime !== undefined) && (
            <Card className="border-l-4 border-amber-500 shadow-sm">
              <CardHeader className="bg-amber-50/50 pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                  <HeartPulse className="h-5 w-5 text-amber-600" />
                  Données Médicales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Résumé des risques */}
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-between p-4 bg-white rounded-xl border border-amber-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <Activity className="h-6 w-6 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Risque</p>
                      <p className="text-lg font-bold text-amber-900">{s.categorie_risque || "Standard"}</p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-amber-200 hidden sm:block"></div>

                  {s.score_total !== undefined && (
                    <div className="text-center">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Score</p>
                      <p className="text-xl font-bold text-gray-700">{s.score_total} <span className="text-sm font-normal text-gray-400">pts</span></p>
                    </div>
                  )}

                  {s.taux_surprime !== undefined && (
                    <div className="text-right">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Surprime</p>
                      <Badge variant="outline" className={`text-lg font-bold px-3 py-1 ${Number(s.taux_surprime) > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                        {s.taux_surprime}%
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Détails du questionnaire si chargé */}
                {questionnaire && (
                  <div className="bg-amber-50/30 rounded-xl p-5 border border-amber-100 space-y-6">
                    {/* Données Physiques */}
                    <div>
                      <h5 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Données Physiques
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-amber-100/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-1 text-gray-500">
                            <Ruler className="h-3 w-3" />
                            <span className="text-xs uppercase tracking-wide">Taille</span>
                          </div>
                          <p className="font-semibold text-gray-900">{questionnaire.taille_cm} cm</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-amber-100/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-1 text-gray-500">
                            <Scale className="h-3 w-3" />
                            <span className="text-xs uppercase tracking-wide">Poids</span>
                          </div>
                          <p className="font-semibold text-gray-900">{questionnaire.poids_kg} kg</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-amber-100/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-1 text-gray-500">
                            <Activity className="h-3 w-3" />
                            <span className="text-xs uppercase tracking-wide">Tension</span>
                          </div>
                          <p className="font-semibold text-gray-900">{questionnaire.tension_arterielle || "-"}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-amber-100/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-1 text-gray-500">
                            <Activity className="h-3 w-3" />
                            <span className="text-xs uppercase tracking-wide">IMC</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {(Number(questionnaire.poids_kg) / Math.pow(Number(questionnaire.taille_cm) / 100, 2)).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Habitudes */}
                    <div>
                      <h5 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Habitudes de vie
                      </h5>
                      <div className="flex gap-4">
                        <Badge variant="outline" className={`px-3 py-1 ${questionnaire.fumeur ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          <Cigarette className="h-3 w-3 mr-2" />
                          {questionnaire.fumeur ? `Fumeur (${questionnaire.nb_cigarettes_jour} cig/j)` : 'Non Fumeur'}
                        </Badge>
                        <Badge variant="outline" className={`px-3 py-1 ${questionnaire.consomme_alcool ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          <Wine className="h-3 w-3 mr-2" />
                          {questionnaire.consomme_alcool ? 'Consomme alcool' : 'Sans alcool'}
                        </Badge>
                        <Badge variant="outline" className={`px-3 py-1 ${questionnaire.pratique_sport ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          <Activity className="h-3 w-3 mr-2" />
                          {questionnaire.pratique_sport ? `Sport (${questionnaire.type_sport})` : 'Pas de sport'}
                        </Badge>
                      </div>
                    </div>

                    {/* Alertes Médicales */}
                    <div>
                      <h5 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Alertes et Antécédents
                      </h5>
                      {questionnaire.infos_complementaires ? (
                        <div className="bg-white p-4 rounded-lg border border-amber-200 text-sm text-gray-700 whitespace-pre-wrap">
                          {questionnaire.infos_complementaires}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucun antécédent particulier signalé.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3 justify-end">
                  {["brouillon", "calculee"].includes(s.statut) && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      onClick={() => router.push(`/simulations/${s.id}/questionnaire`)}
                    >
                      <HeartPulse className="mr-2 h-4 w-4" />
                      {questionnaire ? "Modifier données médicales" : "Compléter le questionnaire"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-900 hover:bg-amber-50"
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div >
  );
}

function InfoRow({ icon: Icon, label, value, isMono = false, highlight = false }: { icon: any, label: string, value?: string, isMono?: boolean, highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 ${highlight ? 'text-indigo-500' : 'text-gray-400'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-indigo-600' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-sm ${highlight ? 'text-indigo-900 font-medium' : 'text-gray-900'} ${isMono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

function DetailRow({ label, value, strong = false, isError = false, className }: { label: string, value?: string | number, strong?: boolean, isError?: boolean, className?: string }) {
  return (
    <div className={`flex justify-between items-center py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-1 rounded transition-colors ${className || ''}`}>
      <span className="text-gray-600 text-sm">{label}</span>
      <span className={`font-medium ${strong ? 'text-lg text-gray-900' : 'text-gray-900'} ${isError ? 'text-red-600' : ''}`}>
        {value || "-"}
      </span>
    </div>
  );
}
