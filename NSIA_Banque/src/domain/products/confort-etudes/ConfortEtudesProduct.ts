import { BaseProduct, ProductContext, ValidationResult } from '@/src/domain/products/base/Product';
import { EtudesFormSchema, EtudesFormData, EtudesPayload } from './ConfortEtudesSchema';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';

export class ConfortEtudesProduct extends BaseProduct<EtudesFormData, EtudesPayload> {
    constructor() {
        super('confort_etudes', 'Confort Etudes');
    }

    get schema() {
        return EtudesFormSchema;
    }

    validate(data: EtudesFormData): ValidationResult {
        const result = EtudesFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };
        return super.formatZodError(result);
    }

    getDefaultValues(): Partial<EtudesFormData> {
        return {
            age_enfant: 5,
            montant_rente: 200000,
            duree_paiement: 10,
            duree_service: 5,
            age_parent: 30,
            periodicite: 'mensuelle',
            mode_paiement: 'prelevement_bancaire',
            assure_est_souscripteur: true,
            deja_souscrit_nsia: false,
            beneficiaire_terme_assure: true,
            beneficiaire_deces_conjoint: false,
            beneficiaire_deces_enfants: false,
            beneficiaire_deces_autres: false,
        };
    }

    buildPayload(data: EtudesFormData, context: ProductContext): EtudesPayload {
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

        return {
            banque: context.banqueId,

            // Paramètres calcul
            age_parent: Number(data.age_parent) || 35,
            age_enfant: Number(data.age_enfant) || 5,
            montant_rente: Number(data.montant_rente) || 200000,
            duree_paiement: Number(data.duree_paiement) || 5,
            duree_service: Number(data.duree_service) || 5,
            duree: Number(data.duree_paiement) || 5,
            prime_periodique_commerciale: 0, // Calculé par le backend

            // Client (assuré)
            nom: this.cleanString(data.nom),
            prenom: this.cleanString(data.prenom),
            date_naissance: this.formatDate(data.date_naissance) || '',
            email: this.cleanString(data.email) || '',
            telephone: this.cleanString(data.telephone) || '',
            cellulaire: this.cleanString(data.telephone) || '',
            titre_assure: this.mapCivility(data.titre_assure),
            numero_compte: this.cleanString(data.numero_compte) || '',
            lieu_naissance: this.cleanString(data.lieu_naissance) || '',
            nationalite: this.cleanString(data.nationalite) || '',
            type_piece_identite: this.cleanString(data.type_piece_identite) || '',
            numero_piece_identite: this.cleanString(data.numero_piece_identite) || '',
            situation_matrimoniale: this.cleanString(data.situation_matrimoniale) || 'marie',
            profession: this.cleanString(data.profession) || '',
            employeur: this.cleanString(data.employeur) || '',
            poste: this.cleanString(data.poste) || '',
            adresse_postale: this.cleanString(data.adresse) || '',
            adresse_geographique: this.cleanString(data.adresse_geographique) || '',
            telephone_domicile: this.cleanString(data.telephone_domicile) || '',
            telephone_bureau: this.cleanString(data.telephone_bureau) || '',
            adresse_employeur: this.cleanString(data.adresse_employeur) || '',
            telephone_employeur: this.cleanString(data.telephone_employeur) || '',

            // Correspondant
            correspondant_nom: this.cleanString(data.correspondant_nom) || '',
            correspondant_prenom: this.cleanString(data.correspondant_prenom) || '',
            correspondant_adresse: this.cleanString(data.correspondant_adresse) || '',
            correspondant_telephone: this.cleanString(data.correspondant_telephone) || '',
            correspondant_cellulaire: this.cleanString(data.correspondant_cellulaire) || '',

            // Modalités
            periodicite: data.periodicite || 'mensuelle',
            mode_paiement: data.mode_paiement || 'prelevement_bancaire',
            origine_des_fonds: data.origine_des_fonds || '',
            date_effet: this.formatDate(data.date_effet) || this.getDefaultDateEffet(),
            date_premiere_cotisation: this.formatDate(data.date_premiere_cotisation) || this.getDefaultDateEffet(),

            // Souscripteur
            assure_est_souscripteur: data.assure_est_souscripteur !== false,
            ...(souscripteur ? { souscripteur } : {}),

            // NSIA existant
            deja_souscrit_nsia: data.deja_souscrit_nsia === true,
            details_contrat_nsia: this.cleanString(data.details_contrat_nsia) || '',

            // Bénéficiaires
            beneficiaire_terme_assure: data.beneficiaire_terme_assure !== false,
            beneficiaire_deces_conjoint: data.beneficiaire_deces_conjoint === true,
            beneficiaire_deces_enfants: data.beneficiaire_deces_enfants === true,
            beneficiaire_deces_autres: data.beneficiaire_deces_autres === true,
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),

            sauvegarder: data.sauvegarder ?? true,
        };
    }
}

export const confortEtudesProduct = new ConfortEtudesProduct();
