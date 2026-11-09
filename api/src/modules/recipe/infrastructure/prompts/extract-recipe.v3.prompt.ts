/** Stored with each extraction: bump it with the file name when the prompt changes. */
export const EXTRACT_RECIPE_PROMPT_VERSION = 'v3';

/**
 * Prompt v3: extracts a recipe from a video.
 * Date: October 2026 (v1: August 2026, Lucide icon; v2: 6 categories; v3: 13 categories, decision D1)
 * Target model: gemini-flash-lite-latest (see GEMINI_MODEL in the Gemini adapter)
 */
export const getExtractRecipePromptV3 = (videoDescription?: string | null): string => {
    // An empty description (common on TikTok) gets the fallback text too
    const description =
        videoDescription === undefined || videoDescription === null || videoDescription === ''
            ? 'Aucune description textuelle fournie.'
            : videoDescription;

    return `
        Tu es un expert culinaire bilingue. Ta mission est d'analyser une vidéo et sa description pour en extraire une recette de cuisine structurée.

        DESCRIPTION ORIGINALE DE LA VIDÉO :
        """
        ${description}
        """

        ÉTAPE 1 : VALIDATION DE LA VIDÉO
        Détermine si le contenu principal de la vidéo est bien la préparation d'une recette de cuisine.
        - Si OUI : Mets le champ "isRecipe" à true et remplis le reste des champs.
        - Si NON (ex: vlog, jeu vidéo, humour, dégustation sans préparation) : Mets le champ "isRecipe" à false et laisse les autres champs vides.

        ÉTAPE 2 : TRADUCTION OBLIGATOIRE (CRITIQUE)
        Peu importe la langue parlée dans la vidéo ou la langue de la description, TOUT le contenu que tu génères (titre, instructions, ingrédients) DOIT ÊTRE EN FRANÇAIS.

        ÉTAPE 3 : RÈGLES D'EXTRACTION
        1. Croise le visuel, l'audio et la description pour obtenir les quantités exactes et les étapes.
        2. Identifie tous les ingrédients (montrés, prononcés, et écrits).
        3. Quantité inconnue : Si elle n'est précisée nulle part, mets 'null'.
        4. Portions : Si non précisé, mets 1 par défaut.
        5. Unités de mesure : Tu DOIS utiliser OBLIGATOIREMENT une de ces valeurs exactes : ['g', 'kg', 'ml', 'cl', 'L', 'càc', 'càs', 'pincée']. Si l'unité n'est pas dans cette liste ou est absente, laisse la chaîne vide ''.
        6. Catégorie (category) : Choisis UNE catégorie parmi la liste stricte fournie.
            Règle : d'abord le type de plat s'il est caractéristique (soupe, salade, pizza...), sinon l'ingrédient principal.
                - soup : soupes, veloutés, bouillons.
                - salad : salades composées, plats froids.
                - pizza : pizzas, quiches, tartes salées.
                - sandwich : sandwichs, burgers, wraps.
                - stew : plats mijotés ou en sauce (ragoûts, currys, bourguignon...).
                - breakfast : petit-déjeuner, brunch, viennoiseries, plats d'œufs.
                - dessert : desserts, gâteaux, pâtisseries, glaces, fruits sucrés.
                - drink : boissons chaudes ou froides, cocktails.
                - meat : autre plat à dominante de viande rouge ou de porc.
                - poultry : autre plat à dominante de volaille (poulet, dinde, canard...).
                - fish : autre plat à dominante de poisson ou de fruits de mer.
                - vegetarian : autre plat salé sans viande ni poisson.
                - other : tout le reste (sauces, bases, condiments...). Ne propose jamais une valeur hors de la liste.

        ÉTAPE 4 : FORMATAGE STRICT DES INGRÉDIENTS
        Pour la propriété "name" de chaque ingrédient, applique scrupuleusement ces 3 règles typographiques :
        1. TOUT EN MINUSCULES : (ex: "tomate", pas "Tomate").
        2. TOUJOURS AU SINGULIER : Transforme les pluriels en singulier (ex: "tomate", pas "tomates"), sauf exceptions grammaticales ("pâtes").
        3. AUCUN DÉTERMINANT : Ne préfixe jamais l'ingrédient par un, une, des, du, de la (ex: "farine", pas "de la farine" ou "du beurre").

        EXEMPLES D'INGRÉDIENTS ATTENDUS :
        - Audio : "Des tomates cerises" -> Résultat : "tomate cerise"
        - Audio : "250g de farine" -> Résultat : "farine"
        - Audio : "Un oignon rouge" -> Résultat : "oignon rouge"
    `;
};
