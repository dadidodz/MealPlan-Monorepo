import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';
import { toUserMessage } from './to-user-message';

describe('toUserMessage', () => {
    it('names a missing recipe from the API code', () => {
        const error = new HttpErrorResponse({ status: 404, error: { code: 'RECIPE_NOT_FOUND' } });
        expect(toUserMessage(error)).toBe('Recette introuvable.');
    });

    it('explains an invalid recipe from the API code', () => {
        const error = new HttpErrorResponse({ status: 422, error: { code: 'INVALID_RECIPE' } });
        expect(toUserMessage(error)).toBe(
            'Recette invalide (titre vide ou nombre de portions incorrect).',
        );
    });

    it('falls back to the status for an unknown code', () => {
        const error = new HttpErrorResponse({ status: 404, error: { code: 'SOMETHING_ELSE' } });
        expect(toUserMessage(error)).toBe('Élément introuvable.');
    });

    it('explains a network failure', () => {
        const error = new HttpErrorResponse({ status: 0 });
        expect(toUserMessage(error)).toBe('Serveur injoignable. Vérifie ta connexion.');
    });

    it('explains a server failure', () => {
        const error = new HttpErrorResponse({ status: 503, error: 'Service Unavailable' });
        expect(toUserMessage(error)).toBe('Le serveur a rencontré une erreur. Réessaie plus tard.');
    });

    it('gives a generic message for other HTTP failures', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: { message: ['title should not be empty'] },
        });
        expect(toUserMessage(error)).toBe('La requête a échoué.');
    });

    it('gives a generic message for a non-HTTP error', () => {
        expect(toUserMessage(new Error('boom'))).toBe('Une erreur inattendue est survenue.');
    });

    it('explains an extraction stream failure by its code', () => {
        expect(toUserMessage(new ApiError('NOT_A_RECIPE'))).toBe(
            'Cette vidéo ne montre pas de recette.',
        );
    });

    it('gives a generic message for an unknown stream code', () => {
        expect(toUserMessage(new ApiError('SOMETHING_NEW'))).toBe(
            'Une erreur inattendue est survenue.',
        );
    });
});
