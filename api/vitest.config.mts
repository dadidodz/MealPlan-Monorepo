import { defineConfig, type TestProjectInlineConfiguration } from 'vitest/config';

/**
 * Projects hitting PostgreSQL: a throwaway Testcontainers database per run (needs Docker running),
 * migrations applied first, one file at a time since files share that database.
 */
const databaseProject = (name: string, include: string[]): TestProjectInlineConfiguration => ({
    extends: true,
    test: {
        name,
        include,
        globalSetup: ['test/setup/test-database.ts'],
        setupFiles: ['test/setup/use-test-database.ts'],
        fileParallelism: false,
        hookTimeout: 120_000, // first run may pull the image; container start takes a few seconds
    },
});

const target = { statements: 80, branches: 80, functions: 80, lines: 80 };

export default defineConfig({
    test: {
        globals: true,
        passWithNoTests: true,
        coverage: {
            // lcov is read by SonarQube Cloud; html to browse locally
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.spec.ts',
                'src/**/*.int-spec.ts',
                'src/**/*.fake.ts',
                'src/**/*.port.ts', // interfaces + injection tokens, no logic
                'src/main.ts',
            ],
            // 80% on unit-testable layers (src/modules, src/shared/domain); adapters/controllers are
            // covered by int/e2e tests.
            thresholds: {
                'src/modules/*/domain/**': target,
                'src/modules/*/application/**': target,
                'src/shared/domain/**': target,
            },
        },
        projects: [
            { extends: true, test: { name: 'unit', include: ['src/**/*.spec.ts'] } },
            databaseProject('integration', ['src/**/*.int-spec.ts']),
            databaseProject('e2e', ['test/**/*.e2e-spec.ts']),
        ],
    },
});
