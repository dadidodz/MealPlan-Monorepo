import { scaleQuantity } from './scale-quantity';

describe('scaleQuantity', () => {
    it('doubles a quantity for twice the people', () => {
        expect(scaleQuantity(200, 4, 2)).toBe(400);
    });

    it('keeps a quantity for the base portions', () => {
        expect(scaleQuantity(150, 3, 3)).toBe(150);
    });

    it('does not round', () => {
        expect(scaleQuantity(100, 1, 3)).toBeCloseTo(33.3333333, 6);
    });

    it('leaves an ingredient without quantity without one', () => {
        expect(scaleQuantity(null, 4, 2)).toBeNull();
    });
});
