// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = defineConfig([
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            // Type-checked presets: no-explicit-any, no-unsafe-* (any leaking through calls/returns)...
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            angular.configs.tsRecommended,
            // Sonar's code-quality rules (bugs, code smells, security hotspots), without a SonarQube server
            sonarjs.configs.recommended,
        ],
        languageOptions: {
            parserOptions: { projectService: true },
        },
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],

            // Typing: explicit return types (callbacks stay inferred), no casts to silence the compiler.
            '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

            // Angular 22 conventions.
            '@angular-eslint/prefer-on-push-component-change-detection': 'off', // OnPush is the default in v22
            '@angular-eslint/prefer-signals': 'error',
            '@angular-eslint/prefer-signal-model': 'error',
            '@angular-eslint/prefer-output-readonly': 'error',
            '@angular-eslint/prefer-host-metadata-property': 'error',
            '@angular-eslint/no-uncalled-signals': 'error',
            '@angular-eslint/no-implicit-take-until-destroyed': 'error',
            '@angular-eslint/no-experimental': 'error',
            '@angular-eslint/no-developer-preview': 'warn',
        },
    },
    {
        files: ['**/*.spec.ts'],
        rules: {
            // Test fakes keep their last instance in a static field that changes on purpose
            'sonarjs/public-static-readonly': 'off',
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
        rules: {
            '@angular-eslint/template/no-any': 'error',
            '@angular-eslint/template/prefer-ngsrc': 'error',
            '@angular-eslint/template/prefer-self-closing-tags': 'error',
            '@angular-eslint/template/button-has-type': 'error',
        },
    },
]);
