import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';

/** French messages for the stable `code` the API puts in domain error bodies and extraction stream errors. */
const MESSAGE_BY_CODE = new Map<string, string>([
    ['RECIPE_NOT_FOUND', 'Recette introuvable.'],
    ['INVALID_RECIPE', 'Recette invalide (titre vide ou nombre de portions incorrect).'],
    ['NOT_A_RECIPE', 'Cette vidéo ne montre pas de recette.'],
    ['INVALID_AI_OUTPUT', "L'IA a rendu une recette inutilisable. Réessaie ou crée-la à la main."],
    // Private or deleted video, timeout, file too big: on purpose, the user isn't told which
    ['VIDEO_DOWNLOAD_FAILED', 'Impossible de récupérer la vidéo de ce lien. Réessaie plus tard.'],
    ['EXTRACTION_FAILED', "L'IA n'a pas réussi à extraire la recette."],
    // Not an API code: the browser lost the extraction stream
    ['CONNECTION_LOST', 'Connexion perdue avec le serveur.'],
]);

/** Turns any error (HTTP or not) into a French message for the user. */
export function toUserMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return MESSAGE_BY_CODE.get(error.code) ?? 'Une erreur inattendue est survenue.';
    }
    if (!(error instanceof HttpErrorResponse)) return 'Une erreur inattendue est survenue.';
    const byCode = MESSAGE_BY_CODE.get(errorCode(error.error) ?? '');
    if (byCode) return byCode;
    if (error.status === 0) return 'Serveur injoignable. Vérifie ta connexion.';
    if (error.status === 404) return 'Élément introuvable.';
    if (error.status >= 500) return 'Le serveur a rencontré une erreur. Réessaie plus tard.';
    return 'La requête a échoué.';
}

function errorCode(body: unknown): string | undefined {
    if (
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        typeof body.code === 'string'
    ) {
        return body.code;
    }
    return undefined;
}
