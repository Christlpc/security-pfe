import { BaseProduct, ProductContext, ValidationResult } from '@/src/domain/products/base/Product';
import { MobateliFormSchema, MobateliFormData, MobateliPayload, MobateliSurMesurePayload } from './MobateliSchema';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';

export class MobateliProduct extends BaseProduct<MobateliFormData, MobateliPayload> {
    constructor() {
        super('mobateli', 'Mobateli');
    }

    get schema() {
        return MobateliFormSchema;
    }

    validate(data: MobateliFormData): ValidationResult {
        const result = MobateliFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };
        return super.formatZodError(result);
    }

    getDefaultValues(): Partial<MobateliFormData> {
        return {
            mode_calcul: 'forfaitaire',
            capital_dtc_iad: 2000000,
            duree_engagement: 4,
            assure_est_souscripteur: true,
            mode_paiement: 'prelevement_bancaire',
            type_cotisation: 'cotisations_annuelles',
            beneficiaire_deces_conjoint: false,
            beneficiaire_deces_enfants: false,
            beneficiaire_deces_autres: false,
            volet: 'dtc',
            type_prime: 'annuelle',
            duree_sur_mesure: 1,
        };
    }

    get allowedCapitals() {
        return [2000000, 5000000, 7500000];
    }

    /** Détecte le mode sélectionné */
    isSurMesure(data: MobateliFormData): boolean {
        return data.mode_calcul === 'sur_mesure';
    }

    /** Build payload pour le mode Sur Mesure — payload complet (même base que forfaitaire) + champs sur mesure */
    buildSurMesurePayload(data: MobateliFormData, context: ProductContext): any {
        // Construire le payload complet forfaitaire comme base
        const basePayload = this.buildPayload(data, context);
        const volet = data.volet || 'dtc';

        // Ajouter les champs spécifiques sur mesure
        const surMesureFields: any = {
            volet,
            date_souscription: this.formatDate(data.date_souscription) || this.getDefaultDateEffet(),
        };

        if (volet === 'dtc') {
            // DTC : prime → capital (le capital sera CALCULÉ par le backend)
            surMesureFields.prime = Number(data.prime_souhaitee) || 0;
            surMesureFields.duree = Number(data.duree_sur_mesure) || 1;
            surMesureFields.type_prime = data.type_prime || 'annuelle';
            // Ne pas envoyer de capital_dtc_iad — c'est le résultat, pas l'input
            delete basePayload.capital_dtc_iad;
        } else {
            // dtc_ff : capital → prime
            surMesureFields.capital = Number(data.capital_sur_mesure) || Number(data.capital_dtc_iad) || 2000000;
        }

        return { ...basePayload, ...surMesureFields };
    }

    /** Build payload pour le mode Forfaitaire (table tarifaire) */
    buildPayload(data: MobateliFormData, context: ProductContext): MobateliPayload {
        // Souscripteur conditionnel
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

        // Conjoint
        const conjointData = data.conjoint;
        const conjoint = conjointData && conjointData.nom
            ? {
                civilite: String(conjointData.civilite || ''),
                nom: String(conjointData.nom || ''),
                prenoms: String(conjointData.prenoms || ''),
                date_naissance: String(conjointData.date_naissance || ''),
                lieu_naissance: String(conjointData.lieu_naissance || ''),
                mobile: String(conjointData.mobile || ''),
                telephone_domicile: String(conjointData.telephone_domicile || ''),
                telephone_bureau: String(conjointData.telephone_bureau || ''),
            }
            : undefined;

        // Enfants
        const enfants = (data.enfants || [])
            .filter((e: any) => e && e.nom_prenoms)
            .map((e: any) => ({
                nom_prenoms: String(e.nom_prenoms || ''),
                date_naissance: String(e.date_naissance || ''),
            }));

        // Bénéficiaires prédéfinis (pour les checkboxes BIA)
        const beneficiaires_predefinis: string[] = [];
        if (data.beneficiaire_deces_conjoint) beneficiaires_predefinis.push('conjoint');
        if (data.beneficiaire_deces_enfants) beneficiaires_predefinis.push('enfants');
        if (data.beneficiaire_deces_autres) beneficiaires_predefinis.push('autres');

        const dureeEngagement = Number(data.duree_engagement) || 4;

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
            numero_compte: this.cleanString(data.numero_compte) || '',
            age: Number(data.age) || 35,

            // Correspondant
            correspondant_nom: this.cleanString(data.correspondant_nom) || '',
            correspondant_prenom: this.cleanString(data.correspondant_prenom) || '',
            correspondant_adresse: this.cleanString(data.correspondant_adresse) || '',
            correspondant_telephone: this.cleanString(data.correspondant_telephone) || '',
            correspondant_cellulaire: this.cleanString(data.correspondant_cellulaire) || '',

            // Convention
            numero_convention: String(data.numero_convention || ''),
            duree_engagement: dureeEngagement,
            duree_contrat: dureeEngagement,

            // Garanties
            capital_dtc_iad: Number(data.capital_dtc_iad) || 2000000,
            montant_frais_funeraires: 500000,
            option_frais_funeraires: (data.option_frais_funeraires === 'aucune' ? '' : data.option_frais_funeraires) || '',

            // Famille
            ...(conjoint ? { conjoint } : {}),
            enfants,

            // Souscripteur
            assure_est_souscripteur: data.assure_est_souscripteur !== false,
            ...(souscripteur ? { souscripteur } : {}),

            // Bénéficiaires prédéfinis
            beneficiaires_predefinis,

            // Paiement
            mode_paiement: data.mode_paiement || 'prelevement_bancaire',
            type_cotisation: data.type_cotisation || 'cotisations_annuelles',
            origine_des_fonds: data.origine_des_fonds || '',
            date_premiere_prime: this.formatDate(data.date_premiere_prime) || this.getDefaultDateEffet(),
            date_effet: this.formatDate(data.date_effet) || this.getDefaultDateEffet(),
            date_echeance: this.formatDate(data.date_echeance) || '',

            // Bénéficiaires
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),
            famille: data.famille || [],
            sauvegarder: data.sauvegarder ?? true,
        };
    }
}

export const mobateliProduct = new MobateliProduct();
