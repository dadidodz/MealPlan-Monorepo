# MealPlan monorepo

A recipe book with meal planning, as one repository:

- `api/`: NestJS 12, Prisma 7, PostgreSQL (hexagonal architecture, see `api/ARCHITECTURE.md`).
- `client/`: Angular 22, Tailwind 4 + DaisyUI 5 (see `client/ARCHITECTURE.md`).
- `shared/`: TypeScript types used by both layers (`@mealplan/shared`).
- `contracts/openapi.yaml`: the API contract, source of truth for both layers.

## Run locally

Needs Node 24 and pnpm through corepack (`corepack enable`; version pinned in `package.json`).

```bash
pnpm install                         # every layer, one lockfile
cp api/.env.example api/.env         # then set a password (both lines)
docker compose -f api/docker-compose.yml --env-file api/.env up -d db   # PostgreSQL on port 5433
pnpm --filter MealPlan-API exec prisma migrate deploy
pnpm --filter MealPlan-API start:dev # API on http://localhost:3000/api (health: /api/app/health)
pnpm --filter mealplan-ui start      # client on http://localhost:4200, /api proxied to the API
pnpm --filter mealplan-ui mock       # or: Prism mock of the contract on 127.0.0.1:4010 (then start:mock)
```
