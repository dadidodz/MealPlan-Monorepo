import pg from 'pg';

/**
 * Empties every table of the E2E database before the suite (the API has already applied the migrations), so each
 * test starts from nothing and creates its own data. Refuses any database whose name doesn't end in `_e2e`.
 */
export default async function emptyTheDatabase(): Promise<void> {
    const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
    await client.connect();
    try {
        const { rows } = await client.query<{ name: string }>('SELECT current_database() AS name');
        const name = rows[0]?.name ?? '';
        if (!name.endsWith('_e2e')) {
            throw new Error(`Refusing to empty "${name}": not an E2E database (its name must end in _e2e)`);
        }

        const tables = await client.query<{ tablename: string }>(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
        );
        if (tables.rows.length === 0) return;
        const list = tables.rows.map(({ tablename }) => `"${tablename}"`).join(', ');
        await client.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    } finally {
        await client.end();
    }
}
