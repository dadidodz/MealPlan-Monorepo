// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Hexagonal layer rules from CLAUDE.md, enforced on import paths.
const frameworkImports = [
  { regex: '^@nestjs/', message: 'No NestJS in this layer.' },
  { regex: '^@prisma/', message: 'Prisma stays in infrastructure.' },
  { regex: '^class-(validator|transformer)$', message: 'Validation DTOs belong to presentation.' },
];
const layerImport = (layers) => ({
  regex: `(^|/|#)(${layers.join('|')})(/|$)`,
  message: 'This layer cannot depend on that layer (see CLAUDE.md layer rules).',
});

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // Sonar's code-quality rules (bugs, code smells, security hotspots), without a SonarQube server
  sonarjs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Typing: explicit return types (callbacks stay inferred), no casts to silence the compiler.
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // Duplicates @typescript-eslint/no-unused-vars, which handles decorators; since ESLint 10 this one misses
      // imports used only as argument-less parameter decorators (`@Body()`). See PLAN.md 5.7b.
      'sonarjs/unused-import': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.int-spec.ts', 'test/**/*.ts'],
    rules: {
      // Test URLs are fake hosts never called, and plain http is sometimes what is tested
      'sonarjs/no-clear-text-protocols': 'off',
      // Test setup runs pnpm from the PATH, on the dev machine and in CI only
      'sonarjs/no-os-command-from-path': 'off',
    },
  },
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...frameworkImports, layerImport(['application', 'infrastructure', 'presentation'])] },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...frameworkImports, layerImport(['infrastructure', 'presentation'])] },
      ],
    },
  },
);
