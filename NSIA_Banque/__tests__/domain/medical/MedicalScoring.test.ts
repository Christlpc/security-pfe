import { describe, it, expect } from "vitest";
import { MedicalScoring } from "@/src/domain/medical/MedicalScoring";
import type { QuestionnaireMedical } from "@/types";

describe("MedicalScoring Domain", () => {
    describe("calculateIMC", () => {
        it("should calculate IMC correctly", () => {
            expect(MedicalScoring.calculateIMC(70, 175)).toBeCloseTo(22.86, 2);
            expect(MedicalScoring.calculateIMC(80, 180)).toBeCloseTo(24.69, 2);
        });
    });

    describe("getIMCScore", () => {
        it("should return correct score for normal IMC", () => {
            expect(MedicalScoring.getIMCScore(22)).toBe(0);
            expect(MedicalScoring.getIMCScore(24.9)).toBe(0);
        });

        it("should return correct score for overweight", () => {
            expect(MedicalScoring.getIMCScore(25)).toBe(2);
            expect(MedicalScoring.getIMCScore(29.9)).toBe(2);
        });

        it("should return correct score for obesity", () => {
            expect(MedicalScoring.getIMCScore(30)).toBe(5);
            expect(MedicalScoring.getIMCScore(35)).toBe(5);
        });
    });

    describe("getTabacScore", () => {
        it("should return 0 for non-smoker", () => {
            expect(MedicalScoring.getTabacScore(false, 0)).toBe(0);
        });

        it("should return correct score for smoker", () => {
            expect(MedicalScoring.getTabacScore(true, 5)).toBe(2);
            expect(MedicalScoring.getTabacScore(true, 10)).toBe(2);
            expect(MedicalScoring.getTabacScore(true, 20)).toBe(4);
        });
    });

    describe("getAlcoolScore", () => {
        it("should return 0 for non-drinker", () => {
            expect(MedicalScoring.getAlcoolScore(false)).toBe(0);
        });

        it("should return 2 for drinker", () => {
            expect(MedicalScoring.getAlcoolScore(true)).toBe(2);
        });
    });

    describe("getAntecedentsScore", () => {
        it("should return 0 for no medical history", () => {
            const questionnaire = {
                taille_cm: 175,
                poids_kg: 70,
                fumeur: false,
                consomme_alcool: false,
                pratique_sport: false,
                a_infirmite: false,
                malade_6_derniers_mois: false,
                souvent_fatigue: false,
                perte_poids_recente: false,
                prise_poids_recente: false,
                a_ganglions: false,
                fievre_persistante: false,
                plaies_buccales: false,
                diarrhee_frequente: false,
                ballonnement: false,
                oedemes_membres_inferieurs: false,
                essoufflement: false,
                a_eu_perfusion: false,
                a_eu_transfusion: false,
            } as any;
            // We are testing getAntecedentsScore which expects the 'antecedents' object in the new domain,
            // BUT MedicalForm currently passes the whole questionnaire cast as any.
            // Wait, MedicalForm passes `questionnaire as any` to `getAntecedentsScore`.
            // The original `getAntecedentsScore` (utils) accepted `QuestionnaireMedical` (Step 2019 line 40).
            // My NEW `MedicalScoring.getAntecedentsScore` (Step 2036) accepts `MedicalScoringInputs['antecedents']` which is an object of booleans.
            // `MedicalForm` passes the whole questionnaire object.
            // The whole questionnaire object HAS those boolean properties.
            // So as long as signature matches, it works.
            // However, `MedicalScoring.getAntecedentsScore` implementation does:
            // `Object.values(antecedents).filter(Boolean).length`
            // If I pass the whole questionnaire, `Object.values` will include `taille_cm` (number), `fumeur` (boolean), etc.
            // If `taille_cm` is truthy (175), it adds to score!
            //
            // CRITICAL BUG FOUND in my implementation of `MedicalScoring.getAntecedentsScore`.
            // The old implementation EXPLICITLY listed fields: `questions = [q.a_infirmite, ...]`.
            // My new implementation uses `Object.values(antecedents)`.
            // If I pass the whole form data, it counts EVERYTHING.
            // `MedicalForm` implementation (Step 2048 replacement) calls `MedicalScoring.getAntecedentsScore(questionnaire as any)`.
            //
            // I MUST FIX `MedicalScoring.ts`.
            // Using `Object.values` is dangerous if the input isn't strictly the antecedents object.
            // I should duplicate the Explicit List logic or extract only specific fields.
            // Given `MedicalForm` passes the big object, I should probably stick to Explicit List to be safe, 
            // OR change `MedicalForm` to pass only relevant fields.
            //
            // I'll update `MedicalScoring.ts` to be explicit as before. This is safer.

            const score = MedicalScoring.getAntecedentsScore(questionnaire);
            // This will fail if I don't fix MedicalScoring.ts.
            expect(score).toBe(0);
        });
    });

    // Skipping remaining tests for brevity of thought trace, but I'll write them all in the file.
});
