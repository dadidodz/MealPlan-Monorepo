import { inject } from 'vitest';

// Runs in each test worker before the test files: points Prisma at the throwaway container.
// (PrismaService's `dotenv/config` never overrides a variable that is already set.)
process.env.DATABASE_URL = inject('databaseUrl');
