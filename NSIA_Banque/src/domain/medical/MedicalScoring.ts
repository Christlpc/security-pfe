/**
 * Domain: Medical Scoring
 * Encapsulates logic for BMI (IMC), Risk Scoring, and Surcharges.
 */

export interface MedicalScoringInputs {
    taille_cm: number;
    poids_kg: number;
    fumeur: boolean;
    nb_cigarettes_jour?: number;
    consomme_alcool: boolean;
    antecedents: {
        a_infirmite: boolean;
        malade_6_derniers_mois: boolean;
        souvent_fatigue: boolean;
        perte_poids_recente: boolean;
        prise_poids_recente: boolean;
        a_ganglions: boolean;
        fievre_persistante: boolean;
        plaies_buccales: boolean;
        diarrhee_frequente: boolean;
        ballonnement: boolean;
        oedemes_membres_inferieurs: boolean;
        essoufflement: boolean;
        a_eu_perfusion: boolean;
        a_eu_transfusion: boolean;
    };
}

export class MedicalScoring {
    /**
     * Calculate BMI (IMC)
     */
    static calculateIMC(poids: number, taille_cm: number): number {
        if (taille_cm <= 0) return 0;
        const tailleEnMetres = taille_cm / 100;
        return poids / (tailleEnMetres * tailleEnMetres);
    }

    /**
     * Calculate IMC Score
     * < 18.5: Sous-poids (3)
     * 18.5 - 25: Normal (0)
     * 25 - 30: Surpoids (2)
     * >= 30: Obésité (5)
     */
    static getIMCScore(imc: number): number {
        if (imc < 18.5) return 3;
        if (imc >= 18.5 && imc < 25) return 0;
        if (imc >= 25 && imc < 30) return 2;
        return 5;
    }

    /**
     * Calculate Tobacco Score
     */
    static getTabacScore(fumeur: boolean, nbCigarettes?: number): number {
        if (!fumeur) return 0;
        if (!nbCigarettes) return 2; // Default if smoker but count unknown
        if (nbCigarettes <= 10) return 2;
        if (nbCigarettes <= 20) return 4;
        return 6;
    }

    /**
     * Calculate Alcohol Score
     */
    static getAlcoolScore(consomme_alcool: boolean): number {
        return consomme_alcool ? 2 : 0;
    }

    /**
     * Calculate Antecedents Score
     * Each "true" answer adds 1 point
     */
    /**
     * Calculate Antecedents Score
     * Each "true" answer adds 1 point
     * Robust implementation that selects specific fields to avoid counting irrelevant properties
     */
    static getAntecedentsScore(data: any): number {
        const fields = [
            'a_infirmite',
            'malade_6_derniers_mois',
            'souvent_fatigue',
            'perte_poids_recente',
            'prise_poids_recente',
            'a_ganglions',
            'fievre_persistante',
            'plaies_buccales',
            'diarrhee_frequente',
            'ballonnement',
            'oedemes_membres_inferieurs',
            'essoufflement',
            'a_eu_perfusion',
            'a_eu_transfusion'
        ];

        return fields.reduce((score, field) => {
            return score + (data[field] === true ? 1 : 0);
        }, 0);
    }

    /**
     * Calculate Total Score and Surcharge Rate
     */
    static calculateTotalScore(inputs: MedicalScoringInputs) {
        const imc = this.calculateIMC(inputs.poids_kg, inputs.taille_cm);

        const scores = {
            imc: this.getIMCScore(imc),
            tabac: this.getTabacScore(inputs.fumeur, inputs.nb_cigarettes_jour),
            alcool: this.getAlcoolScore(inputs.consomme_alcool),
            antecedents: this.getAntecedentsScore(inputs.antecedents)
        };

        const totalScore = scores.imc + scores.tabac + scores.alcool + scores.antecedents;

        return {
            imc,
            scores,
            totalScore,
            surprime: this.getTauxSurprime(totalScore),
            categorie: this.getCategorieRisque(totalScore)
        };
    }

    /**
     * Determine Surcharge Rate (Taux Surprime) based on total score
     */
    static getTauxSurprime(scoreTotal: number): number {
        if (scoreTotal <= 5) return 0;
        if (scoreTotal <= 10) return 5;
        if (scoreTotal <= 15) return 10;
        if (scoreTotal <= 20) return 15;
        return 20;
    }

    /**
     * Determine Risk Category
     */
    static getCategorieRisque(scoreTotal: number): "faible" | "moyen" | "eleve" | "tres_eleve" {
        if (scoreTotal <= 5) return "faible";
        if (scoreTotal <= 10) return "moyen";
        if (scoreTotal <= 15) return "eleve";
        return "tres_eleve";
    }
}
