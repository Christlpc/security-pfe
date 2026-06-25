import { BaseProduct, ProductContext, ValidationResult } from '@/src/domain/products/base/Product';
import { EmprunteurFormSchema, EmprunteurFormData, EmprunteurPayload } from './EmprunteurSchema';
import { sanitizeBeneficiaries } from '@/src/domain/beneficiaries/Beneficiary';

export class EmprunteurProduct extends BaseProduct<EmprunteurFormData, EmprunteurPayload> {
    constructor() {
        super('emprunteur', 'Emprunteur (ADI)');
    }

    get schema() {
        return EmprunteurFormSchema;
    }

    get beneficiaryConfig() {
        return {
            isVisible: true,
            isRequired: true,
            maxBeneficiaries: 1,
            allowedQualites: ['organisme_pret'] as any[],
            isEditable: false
        };
    }

    validate(data: EmprunteurFormData): ValidationResult {
        const result = EmprunteurFormSchema.safeParse(data);
        if (result.success) return { isValid: true, errors: {} };

        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (!errors[path]) errors[path] = [];
            errors[path].push(issue.message);
        }
        return { isValid: false, errors };
    }

    getDefaultValues(): Partial<EmprunteurFormData> {
        return {
            montant_pret: 10000000,
            duree_mois: 60,
            taux_interet: 7.5,
            duree_differe: 0,
            type_pret: 'consommation',
            qualite_assure: 'emprunteur',
            periodicite_remboursement: 'mensuel',
            deja_souscrit_nsia: false,
        };
    }

    buildPayload(data: EmprunteurFormData, context: ProductContext): EmprunteurPayload {
        return {
            banque: context.banqueId,

            // Client (assuré)
            nom: this.cleanString(data.nom),
            prenom: this.cleanString(data.prenom),
            email: this.cleanString(data.email) || '',
            telephone: this.cleanString(data.telephone) || '',
            cellulaire: this.cleanString(data.telephone) || '',
            titre_assure: this.mapCivility(data.titre_assure),
            date_naissance: this.formatDate(data.date_naissance) || '',
            lieu_naissance: this.cleanString(data.lieu_naissance) || '',
            nationalite: this.cleanString(data.nationalite) || '',
            type_piece_identite: this.cleanString(data.type_piece_identite) || '',
            numero_piece_identite: this.cleanString(data.numero_piece_identite) || '',
            adresse_postale: this.cleanString(data.adresse) || '',
            adresse_geographique: this.cleanString(data.adresse_geographique) || '',
            profession: this.cleanString(data.profession) || '',
            employeur: this.cleanString(data.employeur) || '',
            poste: this.cleanString(data.poste) || '',
            adresse_employeur: this.cleanString(data.adresse_employeur) || '',
            telephone_employeur: this.cleanString(data.telephone_employeur) || '',
            telephone_domicile: this.cleanString(data.telephone_domicile) || '',
            telephone_bureau: this.cleanString(data.telephone_bureau) || '',
            situation_matrimoniale: this.cleanString(data.situation_matrimoniale) || 'celibataire',
            numero_compte: this.cleanString(data.numero_compte) || '',

            // Correspondant
            correspondant_nom: this.cleanString(data.correspondant_nom) || '',
            correspondant_prenom: this.cleanString(data.correspondant_prenom) || '',
            correspondant_adresse: this.cleanString(data.correspondant_adresse) || '',
            correspondant_telephone: this.cleanString(data.correspondant_telephone) || '',
            correspondant_cellulaire: this.cleanString(data.correspondant_cellulaire) || '',

            // Qualité
            qualite_assure: data.qualite_assure || 'emprunteur',

            // Prêt
            montant_pret: Number(data.montant_pret),
            duree_mois: Number(data.duree_mois),
            duree_differe: Number(data.duree_differe) || 0,
            taux_interet: Number(data.taux_interet),
            taux_tps: Number(data.taux_tps) || 0,
            type_pret: data.type_pret || 'consommation',
            numero_convention: String(data.numero_convention || ''),
            periodicite_remboursement: data.periodicite_remboursement || 'mensuel',
            origine_des_fonds: data.origine_des_fonds || '',

            // Dates
            date_octroi: this.formatDate(data.date_octroi) || this.getDefaultDateEffet(),
            date_effet: this.formatDate(data.date_effet) || this.getDefaultDateEffet(),
            date_premiere_echeance: this.formatDate(data.date_premiere_echeance) || this.getDefaultDateEffet(),

            // NSIA existant
            deja_souscrit_nsia: data.deja_souscrit_nsia === true,
            details_contrat_nsia: this.cleanString(data.details_contrat_nsia) || '',

            // Meta
            avec_details: false,
            sauvegarder: data.sauvegarder ?? true,
            beneficiaires: sanitizeBeneficiaries(data.beneficiaires),
        };
    }
}

export const emprunteurProduct = new EmprunteurProduct();
