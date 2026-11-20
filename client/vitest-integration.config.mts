import { defineConfig } from 'vitest/config';

// Integration tests (`pnpm test:int`): the data-access services against the Prism mock of the API contract
export default defineConfig({
    test: {
        globalSetup: ['vitest-integration.setup.mts'],
    },
});
