import { describe, it, expect } from 'vitest';
import { emprunteurProduct } from '@/src/domain/products/emprunteur/EmprunteurProduct';
import { ProductContext } from '@/src/domain/products/base/Product';

describe('BaseProduct.mapCivility via EmprunteurProduct', () => {
    const mockContext: ProductContext = {
        banqueId: '1',
        banqueNom: 'Test Bank',
        banqueCode: 'TB',
        userId: 'u1',
        agenceNom: 'Siege',
        agenceCode: '001'
    };

    const baseData = {
        nom: 'Test',
        prenom: 'User',
        montant_pret: 1000000,
        duree_mois: 12,
        taux_interet: 5,
        type_pret: 'consommation'
    };

    it('should clean "Monsieur " with trailing space', () => {
        const payload = emprunteurProduct.buildPayload({
            ...baseData,
            titre_assure: 'Monsieur '
        } as any, mockContext);
        expect(payload.titre_assure).toBe('Monsieur');
    });

    it('should clean "« Monsieur »" with quotes', () => {
        const payload = emprunteurProduct.buildPayload({
            ...baseData,
            titre_assure: '« Monsieur »'
        } as any, mockContext);
        expect(payload.titre_assure).toBe('Monsieur');
    });

    it('should clean " M. " with dots and spaces', () => {
        const payload = emprunteurProduct.buildPayload({
            ...baseData,
            titre_assure: ' M. '
        } as any, mockContext);
        expect(payload.titre_assure).toBe('Monsieur');
    });

    it('should default to "Monsieur" for unknown values', () => {
        const payload = emprunteurProduct.buildPayload({
            ...baseData,
            titre_assure: 'Docteur'
        } as any, mockContext);
        expect(payload.titre_assure).toBe('Monsieur');
    });

    it('should handle Madame variants', () => {
        expect(emprunteurProduct.buildPayload({ ...baseData, titre_assure: 'Mme' } as any, mockContext).titre_assure).toBe('Madame');
        expect(emprunteurProduct.buildPayload({ ...baseData, titre_assure: 'Madame ' } as any, mockContext).titre_assure).toBe('Madame');
    });
});
