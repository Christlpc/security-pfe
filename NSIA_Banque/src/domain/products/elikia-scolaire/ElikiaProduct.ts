import { BaseProduct, ProductContext, ValidationResult } from '@/src/domain/products/base/Product';
import { ElikiaFormSchema, ElikiaFormData, ElikiaPayload } from './ElikiaSchema';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';

// --- Pricing Domain Logic ---

export interface ElikiaTrancheAge {
    label: string;
    age_min: number;
    age_max: number;
}

export interface ElikiaTarif {
    rente_annuelle: number;
    duree_rente: number;
    prime_unique: number;
    tranche_age: string;
    age_min: number;
    age_max: number;
    prime_annuelle: number;
}

const ELIKIA_TRANCHES_AGE: ElikiaTrancheAge[] = [
    { label: "45 ans et moins", age_min: 18, age_max: 45 },
    { label: "46-55 ans", age_min: 46, age_max: 55 },
    { label: "56-64 ans", age_min: 56, age_max: 64 },
];

const ELIKIA_TARIFICATION: ElikiaTarif[] = [
    // Rente 200,000 FCFA - Durée 5 ans
    { rente_annuelle: 200000, duree_rente: 5, prime_unique: 953308, tranche_age: "45 ans et moins", age_min: 18, age_max: 45, prime_annuelle: 5000 },
    { rente_annuelle: 200000, duree_rente: 5, prime_unique: 953308, tranche_age: "46-55 ans", age_min: 46, age_max: 55, prime_annuelle: 10000 },
    { rente_annuelle: 200000, duree_rente: 5, prime_unique: 953308, tranche_age: "56-64 ans", age_min: 56, age_max: 64, prime_annuelle: 20000 },

    // Rente 400,000 FCFA - Durée 5 ans
    { rente_annuelle: 400000, duree_rente: 5, prime_unique: 1906616, tranche_age: "45 ans et moins", age_min: 18, age_max: 45, prime_annuelle: 10000 },
    { rente_annuelle: 400000, duree_rente: 5, prime_unique: 1906616, tranche_age: "46-55 ans", age_min: 46, age_max: 55, prime_annuelle: 20000 },
    { rente_annuelle: 400000, duree_rente: 5, prime_unique: 1906616, tranche_age: "56-64 ans", age_min: 56, age_max: 64, prime_annuelle: 37000 },

    // Rente 600,000 FCFA - Durée 5 ans
    { rente_annuelle: 600000, duree_rente: 5, prime_unique: 2859924, tranche_age: "45 ans et moins", age_min: 18, age_max: 45, prime_annuelle: 15000 },
    { rente_annuelle: 600000, duree_rente: 5, prime_unique: 2859924, tranche_age: "46-55 ans", age_min: 46, age_max: 55, prime_annuelle: 30000 },
    { rente_annuelle: 600000, duree_rente: 5, prime_unique: 2859924, tranche_age: "56-64 ans", age_min: 56, age_max: 64, prime_annuelle: 55000 },

    // Rente 800,000 FCFA - Durée 5 ans
    { rente_annuelle: 800000, duree_rente: 5, prime_unique: 3813233, tranche_age: "45 ans et moins", age_min: 18, age_max: 45, prime_annuelle: 20000 },
    { rente_annuelle: 800000, duree_rente: 5, prime_unique: 3813233, tranche_age: "46-55 ans", age_min: 46, age_max: 55, prime_annuelle: 40000 },
    { rente_annuelle: 800000, duree_rente: 5, prime_unique: 3813233, tranche_age: "56-64 ans", age_min: 56, age_max: 64, prime_annuelle: 73000 },

    // Rente 1,000,000 FCFA - Durée 5 ans
    { rente_annuelle: 1000000, duree_rente: 5, prime_unique: 4766541, tranche_age: "45 ans et moins", age_min: 18, age_max: 45, prime_annuelle: 25000 },
    { rente_annuelle: 1000000, duree_rente: 5, prime_unique: 4766541, tranche_age: "46-55 ans", age_min: 46, age_max: 55, prime_annuelle: 50000 },
    { rente_annuelle: 1000000, duree_rente: 5, prime_unique: 4766541, tranche_age: "56-64 ans", age_min: 56, age_max: 64, prime_annuelle: 90000 },
];

export class ElikiaProduct extends BaseProduct<ElikiaFormData, ElikiaPayload> {
    constructor() {
        super('elikia_scolaire', 'Likama (Elikia Scolaire)');
    }

    get schema() {
        return ElikiaFormSchema;
    }

    validate(data: ElikiaFormData): ValidationResult {
        const result = ElikiaFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };
        return super.formatZodError(result);
    }

    getDefaultValues(): Partial<ElikiaFormData> {
        return {
            rente_annuelle: 600000,
            duree_rente: 5,
            age_parent: 30,
            assure_est_souscripteur: true,
            type_cotisation: 'cotisations_annuelles',
            mode_paiement: 'prelevement_bancaire',
        };
    }

    // --- Pricing Methods ---

    get rentesAnnuelleOptions() {
        return [200000, 400000, 600000, 800000, 1000000];
    }

    get dureesRenteOptions() {
        return [5];
    }

    calculateTarif(rente_annuelle: number, duree_rente: number, age: number): ElikiaTarif | null {
        const tranche = ELIKIA_TRANCHES_AGE.find(t => age >= t.age_min && age <= t.age_max);
        if (!tranche) return null;
        return ELIKIA_TARIFICATION.find(
            t => t.rente_annuelle === rente_annuelle &&
                t.duree_rente === duree_rente &&
                t.tranche_age === tranche.label
        ) || null;
    }

    isEligible(age: number): boolean {
        return age >= 18 && age <= 64;
    }

    getTrancheAge(age: number): ElikiaTrancheAge | null {
        return ELIKIA_TRANCHES_AGE.find(t => age >= t.age_min && age <= t.age_max) || null;
    }

    buildPayload(data: ElikiaFormData, context: ProductContext): ElikiaPayload {
        // Construction souscripteur si différent de l'assuré
        const souscripteur = data.assure_est_souscripteur === false
            ? {
                civilite: this.cleanString(data.souscripteur_civilite) || '',
                nom: this.cleanString(data.souscripteur_nom) || '',
                prenoms: this.cleanString(data.souscripteur_prenoms) || '',
                date_naissance: this.formatDate(data.souscripteur_date_naissance) || '',
                lieu_naissance: this.cleanString(data.souscripteur_lieu_naissance) || '',
                adresse: this.cleanString(data.souscripteur_adresse) || '',
                telephone: this.cleanString(data.souscripteur_telephone) || '',
                profession: this.cleanString(data.souscripteur_profession) || '',
                employeur: this.cleanString(data.souscripteur_employeur) || '',
            }
            : undefined;

        // Sanitize élèves
        const eleves = (data.eleves || [])
            .filter((e: any) => e && e.nom_prenoms)
            .map((e: any) => ({
                nom_prenoms: String(e.nom_prenoms || ''),
                date_naissance: String(e.date_naissance || ''),
                qualite: String(e.qualite || ''),
            }));

        const dureeEngagement = Number(data.duree_engagement) || 4;
        const dureeRente = Number(data.duree_rente) || 5;

        return {
            banque: context.banqueId,

            // Client (assuré)
            nom: this.cleanString(data.nom),
            prenom: this.cleanString(data.prenom),
            titre_assure: this.mapCivility(data.titre_assure),
            date_naissance: this.formatDate(data.date_naissance) || '',
            lieu_naissance: this.cleanString(data.lieu_naissance) || '',
            nationalite: this.cleanString(data.nationalite) || '',
            type_piece_identite: this.cleanString(data.type_piece_identite) || '',
            numero_piece_identite: this.cleanString(data.numero_piece_identite) || '',
            age_parent: Number(data.age_parent) || 30,
            situation_matrimoniale: this.cleanString(data.situation_matrimoniale) || 'marie',
            profession: this.cleanString(data.profession) || '',
            employeur: this.cleanString(data.employeur) || '',
            poste: this.cleanString(data.poste) || '',
            email: this.cleanString(data.email) || '',
            telephone: this.cleanString(data.telephone) || '',
            cellulaire: this.cleanString(data.telephone) || '',
            telephone_domicile: this.cleanString(data.telephone_domicile) || '',
            telephone_bureau: this.cleanString(data.telephone_bureau) || '',
            adresse_postale: this.cleanString(data.adresse) || '',
            adresse_geographique: this.cleanString(data.adresse_geographique) || '',
            adresse_employeur: this.cleanString(data.adresse_employeur) || '',
            telephone_employeur: this.cleanString(data.telephone_employeur) || '',
            numero_convention: String(data.numero_convention || ''),
            numero_compte: String(data.numero_compte || ''),

            // Correspondant
            correspondant_nom: this.cleanString(data.correspondant_nom) || '',
            correspondant_prenom: this.cleanString(data.correspondant_prenom) || '',
            correspondant_adresse: this.cleanString(data.correspondant_adresse) || '',
            correspondant_telephone: this.cleanString(data.correspondant_telephone) || '',
            correspondant_cellulaire: this.cleanString(data.correspondant_cellulaire) || '',

            // Dates
            date_signature: this.formatDate(data.date_signature) || this.getDefaultDateEffet(),
            date_effet: this.formatDate(data.date_effet) || this.getDefaultDateEffet(),
            date_fin: this.formatDate(data.date_fin) || '',
            date_premiere_prime: this.formatDate(data.date_premiere_prime) || this.getDefaultDateEffet(),
            date_echeance: this.formatDate(data.date_echeance) || '',

            // Produit
            duree_engagement: dureeEngagement,
            duree_rente: dureeRente,
            duree_contrat: dureeEngagement + dureeRente,
            rente_annuelle: Number(data.rente_annuelle),

            // Élèves
            eleves,

            // Paiement
            mode_paiement: data.mode_paiement || 'prelevement_bancaire',
            operateur_mobile_money: this.cleanString(data.operateur_mobile_money) || '',
            type_cotisation: data.type_cotisation || 'cotisations_annuelles',
            origine_des_fonds: data.origine_des_fonds || '',

            // Souscripteur
            assure_est_souscripteur: data.assure_est_souscripteur !== false,
            ...(souscripteur ? { souscripteur } : {}),

            // Bénéficiaires décès
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),

            sauvegarder: data.sauvegarder ?? true,
        };
    }
}

export const elikiaProduct = new ElikiaProduct();
