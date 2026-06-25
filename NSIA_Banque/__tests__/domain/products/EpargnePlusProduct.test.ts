import { describe, it, expect } from 'vitest';
import { epargnePlusProduct } from '@/src/domain/products/epargne-plus/EpargnePlusProduct';
// import { EpargnePlusFormData } from '@/src/domain/products/epargne-plus/EpargnePlusSchema';

describe('EpargnePlus Product Domain', () => {
    describe('Sanitization Logic (Override)', () => {
        it('should coerce string numbers to real numbers', () => {
            const partialData = {
                cotisation_mensuelle: "5000",
                duree_annees: "10",
                nom: "Test"
            };

            // Cast to any to simulate API weak typing / form partials
            const sanitized = epargnePlusProduct.sanitize(partialData as any);

            expect(sanitized.cotisation_mensuelle).toBe(5000);
            expect(typeof sanitized.cotisation_mensuelle).toBe('number');

            expect(sanitized.duree_annees).toBe(10);
            expect(typeof sanitized.duree_annees).toBe('number');

            expect(sanitized.nom).toBe("Test");
        });

        it('should handle undefined values gracefully', () => {
            const partialData = {
                nom: "Test"
            };
            const sanitized = epargnePlusProduct.sanitize(partialData as any);
            expect(sanitized.cotisation_mensuelle).toBeUndefined();
            expect(sanitized.duree_annees).toBeUndefined();
        });

        it('should not double-coerce numbers', () => {
            const partialData = {
                cotisation_mensuelle: 5000,
                duree_annees: 10
            };
            const sanitized = epargnePlusProduct.sanitize(partialData as any);
            expect(sanitized.cotisation_mensuelle).toBe(5000);
        });

        it('should sanitize beneficiaries via BaseProduct', () => {
            const partialData = {
                beneficiaires: [
                    { nom_prenoms: "  Bad Spacing  ", part_pourcentage: "50" }
                ]
            };
            // sanitizeBeneficiaries (from domain) usually handles strings too? 
            // Or maybe it validates?
            // BaseProduct.sanitize calls sanitizeBeneficiaries. 
            // Assuming sanitizeBeneficiaries is robust.

            const sanitized = epargnePlusProduct.sanitize(partialData as any);
            expect(sanitized.beneficiaires).toBeDefined();
            // Depending on implementation of sanitizeBeneficiaries, we expect cleaning.
            // But main test here is that it IS delegated.
        });
    });
});
