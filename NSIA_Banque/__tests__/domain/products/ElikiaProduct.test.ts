import { describe, it, expect } from 'vitest';
import { elikiaProduct } from '@/src/domain/products/elikia-scolaire/ElikiaProduct';
import { ProductContext } from '@/src/domain/products/base/Product';
import { ElikiaFormData } from '@/src/domain/products/elikia-scolaire/ElikiaSchema';

describe('ElikiaProduct Domain', () => {
    describe('Pricing Logic', () => {
        it('should calculate tarif for standard values', () => {
            // Rente 200,000, 5 ans, Age 30 (Tranche < 45)
            const tarif = elikiaProduct.calculateTarif(200000, 5, 30);

            expect(tarif).toBeDefined();
            expect(tarif?.rente_annuelle).toBe(200000);
            expect(tarif?.prime_unique).toBeGreaterThan(0);
            expect(tarif?.tranche_age).toBe('45 ans et moins');
        });

        it('should return null for invalid rente', () => {
            const tarif = elikiaProduct.calculateTarif(999999, 5, 30);
            expect(tarif).toBeNull();
        });

        it('should handle age tranches correctly', () => {
            const tarifYoung = elikiaProduct.calculateTarif(200000, 5, 30);
            expect(tarifYoung?.tranche_age).toBe('45 ans et moins');

            const tarifMid = elikiaProduct.calculateTarif(200000, 5, 50);
            expect(tarifMid?.tranche_age).toBe('46-55 ans');

            const tarifSenior = elikiaProduct.calculateTarif(200000, 5, 60);
            expect(tarifSenior?.tranche_age).toBe('56-64 ans');
        });
    });

    describe('Eligibility', () => {
        it('should accept eligible ages', () => {
            expect(elikiaProduct.isEligible(18)).toBe(true);
            expect(elikiaProduct.isEligible(64)).toBe(true);
            expect(elikiaProduct.isEligible(30)).toBe(true);
        });

        it('should reject ineligible ages', () => {
            expect(elikiaProduct.isEligible(17)).toBe(false);
            expect(elikiaProduct.isEligible(65)).toBe(false);
        });
    });

    describe('Payload Building', () => {
        const mockContext: ProductContext = {
            banqueId: 'banque-uuid',
            banqueNom: 'BOA',
            banqueCode: '12345',
            userId: 'user-id',
            agenceId: 'agence-id',
            agenceNom: 'BOASIEGE',
            agenceCode: '00001'
        };

        const partialData: ElikiaFormData = {
            nom: 'Doe',
            prenom: 'John',
            date_naissance: '1990-01-01',
            telephone: '0600000000',
            rente_annuelle: 200000,
            duree_rente: 5,
            age_parent: 30, // Form uses age_parent for the insured
            beneficiaires: [],
            sauvegarder: true,
            periodicite: 'M'
        } as any; // Using any to skip non-required fields for test brevity

        it('should build payload with calculated fields', () => {
            const payload = elikiaProduct.buildPayload(partialData, mockContext);

            expect(payload.banque).toBe('banque-uuid');
            expect(payload.nom).toBe('Doe'); // cleanString only trims
            expect(payload.rente_annuelle).toBe(200000);
            expect(payload.periodicite).toBe('mensuelle'); // M -> mensuelle
        });

        it('should default unspecified fields', () => {
            const minimalData = { ...partialData, employeur: undefined };
            const payload = elikiaProduct.buildPayload(minimalData, mockContext);
            expect(payload.employeur).toBe('N/A'); // Default check
        });
    });
});
