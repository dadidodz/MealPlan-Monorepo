import { extractionStatusOf } from './recipe-ai-extraction.entity';

describe('extractionStatusOf', () => {
    it('reads a known status', () => {
        expect(extractionStatusOf('SUCCESS')).toBe('SUCCESS');
    });

    it('rejects an unknown status', () => {
        expect(() => extractionStatusOf('DONE')).toThrow('Unknown extraction status DONE');
    });
});
