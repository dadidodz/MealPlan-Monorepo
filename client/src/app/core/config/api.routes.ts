// Relative in every build: /api is routed to the API by the dev server proxy (proxy.conf.json) in dev and by
// the server's reverse proxy in production (the UI image's own nginx only serves static files)
const BASE_URL = '/api';

export const ApiRoutes = {
    RECIPES: {
        BASE: `${BASE_URL}/recipes`,
        EXTRACT: `${BASE_URL}/recipes/extract`,
        CACHED: (url: string) =>
            `${BASE_URL}/recipes/extract/cached?url=${encodeURIComponent(url)}`,
        STREAM: (jobId: string) => `${BASE_URL}/recipes/stream/${jobId}`,
        BY_ID: (id: string) => `${BASE_URL}/recipes/${id}`,
    },
    INGREDIENTS: {
        BASE: `${BASE_URL}/ingredients`,
        SEARCH: `${BASE_URL}/ingredients/search`,
    },
    PLANNED_MEALS: {
        BASE: `${BASE_URL}/planned-meals`,
    },
} as const;
