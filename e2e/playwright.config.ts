import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Own ports, so the development API (3000) and client (4200) can keep running during the tests
const API_PORT = 3100;
const CLIENT_PORT = 4300;

// Locally the database settings come from api/.env; in CI from the job's environment
if (existsSync('../api/.env')) process.loadEnvFile('../api/.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (api/.env or the environment)');

// Same server and credentials as the API's database, but a database of its own, never the development one
const e2eDatabase = new URL(process.env.DATABASE_URL);
e2eDatabase.pathname = '/mealplan_e2e';
process.env.E2E_DATABASE_URL = e2eDatabase.href; // read by global-setup.ts

export default defineConfig({
    testDir: './tests',
    // Runs once the servers are up, so after the migrations
    globalSetup: './global-setup.ts',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${CLIENT_PORT}`,
        trace: 'retain-on-failure',
    },
    // The user's installed Chrome (also on the CI's Ubuntu runners): no browser download
    projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
    webServer: [
        {
            // Migrations first (creates the database if missing), then the built API
            command: 'pnpm exec prisma migrate deploy && pnpm build && pnpm start:prod',
            cwd: '../api',
            url: `http://localhost:${API_PORT}/api/app/health`,
            env: {
                PORT: String(API_PORT),
                DATABASE_URL: e2eDatabase.href,
                // Never a real key: no test may reach Gemini
                GEMINI_API_KEY: 'not-set',
            },
            reuseExistingServer: false,
            timeout: 180_000,
        },
        {
            command: `pnpm exec ng serve --port ${CLIENT_PORT} --proxy-config ../e2e/proxy.conf.json`,
            cwd: '../client',
            url: `http://localhost:${CLIENT_PORT}`,
            reuseExistingServer: false,
            timeout: 180_000,
        },
    ],
});
