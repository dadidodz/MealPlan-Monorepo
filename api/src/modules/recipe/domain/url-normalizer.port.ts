export const URL_NORMALIZER = Symbol('UrlNormalizer');

/** Turns a pasted link into the canonical link recipes and extractions are stored under. */
export interface UrlNormalizer {
    /**
     * Follows short links (vm.tiktok.com, vt.tiktok.com, instagr.am) and drops the query string.
     * Never fails: when a short link can't be followed, returns it without its query string.
     */
    normalize(url: string): Promise<string>;
}
