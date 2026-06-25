import { BaseProduct, ProductContext, ValidationResult, BeneficiaryConfig } from '@/src/domain/products/base/Product';
import { RetraiteFormSchema, RetraiteFormData, RetraitePayload } from './ConfortRetraiteSchema';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';

export class ConfortRetraiteProduct extends BaseProduct<RetraiteFormData, RetraitePayload> {
    constructor() {
        super('confort_retraite', 'Confort Retraite');
    }

    get schema() {
        return RetraiteFormSchema;
    }

    get config(): BeneficiaryConfig {
        return {
            isVisible: true,
            isRequired: true,
            maxBeneficiaries: 10,
            allowedQualites: ['conjoint', 'enfant', 'parent', 'frere_soeur', 'autre', 'assure'] as any[],
            excludesAssureFromTotal: true
        };
    }

    get beneficiaryConfig() {
        return this.config;
    }

    validate(data: RetraiteFormData): ValidationResult {
        const result = RetraiteFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };
        return super.formatZodError(result);
    }

    getDefaultValues(): Partial<RetraiteFormData> {
        return {
            duree: 10,
            prime_periodique_commerciale: 50000,
            periodicite: 'mensuelle',
            mode_paiement: 'prelevement_bancaire',
            assure_est_souscripteur: true,
            beneficiaire_terme_assure: true,
            deja_souscrit_nsia: false,
            beneficiaire_deces_conjoint: false,
            beneficiaire_deces_enfants: false,
            beneficiaire_deces_autres: false,
        };
    }

    buildPayload(data: RetraiteFormData, context: ProductContext): RetraitePayload {
        // Construire l'objet souscripteur si différent de l'assuré
        const assureEstSouscripteur = data.assure_est_souscripteur !== false;
        let souscripteur: Record<string, any> | undefined;

        if (!assureEstSouscripteur) {
            souscripteur = {
                civilite: data.souscripteur_civilite || '',
                nom: data.souscripteur_nom || '',
                prenoms: data.souscripteur_prenoms || '',
                date_naissance: data.souscripteur_date_naissance || '',
                lieu_naissance: data.souscripteur_lieu_naissance || '',
                adresse: data.souscripteur_adresse || '',
                telephone: data.souscripteur_telephone || '',
                profession: data.souscripteur_profession || '',
                employeur: data.souscripteur_employeur || '',
            };
        }

        return {
            banque: context.banqueId,

            // ── Cotisation ──────────────────────────────────────
            prime_periodique_commerciale: Number(data.prime_periodique_commerciale),
            periodicite: data.periodicite || 'mensuelle',
            mode_paiement: data.mode_paiement || 'prelevement_bancaire',
            origine_des_fonds: data.origine_des_fonds || '',

            // ── Garanties ───────────────────────────────────────
            duree: Number(data.duree),
            capital_deces: Number(data.capital_deces) || 0,
            date_premiere_cotisation: data.date_premiere_cotisation || '',

            // ── Identité assuré (Step 1 commun) ─────────────────
            nom: this.cleanString(data.nom),
            prenom: this.cleanString(data.prenom),
            date_naissance: this.formatDate(data.date_naissance) || '',
            email: this.cleanString(data.email) || '',
            telephone: this.cleanString(data.telephone) || '',
            cellulaire: this.cleanString(data.telephone) || '',
            telephone_domicile: this.cleanString(data.telephone_domicile) || '',
            telephone_bureau: this.cleanString(data.telephone_bureau) || '',
            titre_assure: this.mapCivility(data.titre_assure),
            lieu_naissance: this.cleanString(data.lieu_naissance) || '',
            situation_matrimoniale: this.cleanString(data.situation_matrimoniale) || 'celibataire',
            adresse_postale: this.cleanString(data.adresse) || '',
            adresse_geographique: this.cleanString(data.adresse_geographique) || '',
            profession: this.cleanString(data.profession) || '',
            employeur: this.cleanString(data.employeur) || '',
            adresse_employeur: this.cleanString(data.adresse_employeur) || '',
            telephone_employeur: this.cleanString(data.telephone_employeur) || '',
            numero_compte: this.cleanString(data.numero_compte) || '',

            // ── Correspondant ───────────────────────────────────
            correspondant_nom: this.cleanString(data.correspondant_nom) || '',
            correspondant_telephone: this.cleanString(data.correspondant_telephone) || '',
            correspondant_cellulaire: this.cleanString(data.correspondant_cellulaire) || '',

            // ── Souscripteur ────────────────────────────────────
            assure_est_souscripteur: assureEstSouscripteur,
            souscripteur,

            // ── NSIA existant ───────────────────────────────────
            deja_souscrit_nsia: data.deja_souscrit_nsia || false,
            details_contrat_nsia: this.cleanString(data.details_contrat_nsia) || '',

            // ── Bénéficiaires ───────────────────────────────────
            beneficiaire_terme_assure: data.beneficiaire_terme_assure !== false,
            beneficiaires_terme: [],
            beneficiaire_deces_conjoint: data.beneficiaire_deces_conjoint || false,
            beneficiaire_deces_enfants: data.beneficiaire_deces_enfants || false,
            beneficiaire_deces_autres: data.beneficiaire_deces_autres || false,
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),

            sauvegarder: data.sauvegarder ?? true,
        };
    }

    /**
     * Calculate Min/Max for Capital Deces based on periodic prime and frequency.
     * Rule: Min 1,000,000. Max = Annual Prime * 10.
     */
    getCapitalDecesRange(primePeriodique: number, periodicite: string) {
        if (!primePeriodique || primePeriodique <= 0) {
            return { min: 1000000, max: 1000000, primeAnnuelle: 0 };
        }

        const periodiciteMultipliers: Record<string, number> = {
            'mensuelle': 12, 'trimestrielle': 4, 'semestrielle': 2, 'annuelle': 1,
            'M': 12, 'T': 4, 'S': 2, 'A': 1,
        };
        const multiplier = periodiciteMultipliers[periodicite || 'mensuelle'] || 12;
        const primeAnnuelle = primePeriodique * multiplier;
        const min = 1000000;
        const max = primeAnnuelle * 10;

        return { min, max: Math.max(min, max), primeAnnuelle };
    }
}

export const confortRetraiteProduct = new ConfortRetraiteProduct();
