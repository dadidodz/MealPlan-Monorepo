/**
 * Code identifying an ingredient across recipes: " PÂte brisée " → "pate-brisee".
 * Search compares codes too, so "pate" finds "Pâte brisée".
 */
export function ingredientCodeOf(name: string): string {
    return (
        name
            .trim()
            .toLowerCase()
            // Ligatures are single letters that NFD does not split
            .replaceAll('œ', 'oe')
            .replaceAll('æ', 'ae')
            // Split letters from their accents ("é" → "e" + "´")
            .normalize('NFD')
            // Drop the accents
            .replace(/[̀-ͯ]/g, '')
            // Spaces and underscores → hyphens
            .replace(/[\s_]+/g, '-')
            // Drop anything that is not a letter, a digit or a hyphen
            .replace(/[^a-z0-9-]/g, '')
            // One hyphen between words, none at the ends ("herbes (de provence) !" → "herbes-de-provence")
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    );
}
