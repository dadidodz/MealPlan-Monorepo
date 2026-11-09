import { execSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
    export interface ProvidedContext {
        databaseUrl: string;
    }
}

/**
 * Vitest global setup of the projects using the database (integration, e2e).
 * Starts a throwaway PostgreSQL container (same image as docker-compose), applies the migrations,
 * hands its URL to the tests, and removes the container (and its data) when the run ends.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
        'postgres:18-alpine',
    ).start();
    const databaseUrl = container.getConnectionUri();

    execSync('pnpm exec prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    project.provide('databaseUrl', databaseUrl);

    return async () => {
        await container.stop();
    };
}
