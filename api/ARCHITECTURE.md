# How the API works

A guided tour of the code as it is now (2026-10-09): where things live, how a request travels through the layers,
and how the recipe import works end to end. The rules themselves are in [CLAUDE.md](CLAUDE.md); this file explains
the code that follows them.

## 1. The big picture: still hexagonal

Yes, the API is still a hexagonal architecture ("ports and adapters"). What changed during the alignment is that it
is now **strict and grouped by feature**: each feature (`recipe`, `ingredient`) has its own folder with the same
four layers inside.

```
          HTTP request                                   PostgreSQL, Gemini, yt-dlp + ffmpeg
               │                                                     ▲
               ▼                                                     │
  ┌─ presentation ──────────────┐                     ┌─ infrastructure ─────────────────┐
  │ controller, DTO (validates) │                     │ adapters: Prisma repositories,   │
  │ presenter (entity → JSON)   │                     │ Gemini, yt-dlp client, job store │
  └──────────────┬──────────────┘                     └──────────────▲───────────────────┘
                 │ calls                                             │ implements
                 ▼                                                   │
  ┌─ application ───────────────┐   uses    ┌─ domain ───────────────┴───────────────────┐
  │ use cases: one class,       │ ───────▶  │ entities (business rules), domain errors,  │
  │ one execute()               │           │ ports = interfaces the use cases need      │
  └─────────────────────────────┘           └────────────────────────────────────────────┘
```

- **domain** — the business: what a recipe is, which values are valid, which errors exist. Pure TypeScript: no
  NestJS, no Prisma, no HTTP. It also declares **ports**: interfaces like `RecipeRepository` ("I need something
  that can save and find recipes") without saying how.
- **application** — the use cases ("create a recipe", "extract a draft from a link"). They orchestrate: load
  entities through ports, call entity methods, save. They only know the domain.
- **infrastructure** — the **adapters**: classes implementing the ports with real technology (Prisma, the Gemini
  SDK, the `yt-dlp` program run with `execFile`, an in-memory job store).
- **presentation** — the HTTP edge: controllers, DTOs (shape of requests and responses), presenters (turn an entity
  into a response DTO).

The arrows only go inwards: the domain depends on nothing, so business rules can be tested without a database or
NestJS, and an adapter can be replaced (e.g. another AI provider) without touching the use cases. ESLint enforces
this (`no-restricted-imports`: domain/application can't import NestJS, Prisma or other layers).

## 2. Folder map

```
src/
  main.ts                         starts NestJS: /api prefix, CORS, Swagger UI (/api/docs), graceful shutdown
  app.module.ts                   root module: imports the modules, global validation pipe + error filter
  infrastructure/database/        PrismaService (the database connection, shared by every module)
  shared/                         code used by several modules
    domain/                       DomainError (base of every business error), Clock port (+ fake)
    infrastructure/               SystemClock (the real clock), DependenciesProbe (reach of TikTok, Instagram, Gemini)
    presentation/                 DomainErrorFilter (business error → HTTP status + `code`), AppController
                                  (GET /api/app/health, /api/app/health/dependencies)
    shared.module.ts              provides the Clock to every module
  modules/
    recipe/                       recipes and the import pipeline (most of the app)
      domain/  application/  infrastructure/  presentation/  recipe.module.ts
    ingredient/                   ingredient search (autocomplete)
      domain/  application/  infrastructure/  presentation/  ingredient.module.ts
prisma/
  schema.prisma                   database tables
  migrations/                     one SQL folder per schema change (applied in order)
test/                             e2e tests (HTTP) + Testcontainers setup
docker/migrate.sh                 the one-shot migration job of the `migrate` image
```

File names say their role (decision D3, flat layers): `.entity.ts`, `.port.ts`, `.fake.ts` (in-memory port for
tests), `.error.ts`, `.use-case.ts`, `.dto.ts`, `.presenter.ts`, `.mapper.ts`, `.adapter.ts` / `prisma-*.ts`.
A spec sits next to its file: `.spec.ts` (unit), `.int-spec.ts` (integration, real database).

## 3. From startup to a request

**Startup** (`main.ts` → `AppModule`):
1. `NestFactory.create(AppModule)` builds the dependency graph from the modules.
2. Every route is prefixed with `/api` (the reverse proxy keeps the prefix in production).
3. `AppModule` registers two global helpers for every request:
   - a `ValidationPipe`: request bodies are checked against their DTO (class-validator decorators); unknown fields
     are rejected (400), so the UI can't send a field the API doesn't expect;
   - the `DomainErrorFilter`: any `DomainError` thrown anywhere becomes an HTTP response with a status and a `code`.
4. `SharedModule` (the Clock) and `PrismaModule` (the database) are `@Global`: every module can inject them.

**A request, step by step** — `PATCH /api/recipes/42` with `{ "title": "Quiche" }`:

| Step | File | What happens |
|---|---|---|
| 1 | `recipe.controller.ts` → `updateRecipe()` | Nest routes the call; `recipeIdPipe` checks the id is a UUID (a malformed id answers 404) |
| 2 | `update-recipe.dto.ts` | the global pipe validates the body against `UpdateRecipeDto` (types, `@Min(1)`, allowed categories…) |
| 3 | controller | copies the DTO into an `UpdateRecipeCommand` (plain object, no HTTP types) |
| 4 | `update-recipe.use-case.ts` → `execute()` | loads the recipe through the `RecipeRepository` port; not found → throws `RecipeNotFoundError` |
| 5 | `recipe.entity.ts` → `rename()` | the entity checks its own rule (title not blank, else `InvalidRecipeError`) and refreshes `updatedAt` with the time from the `Clock` |
| 6 | use case | saves through the port |
| 7 | `prisma-recipe.repository.ts` + `recipe.mapper.ts` | the adapter turns the entity into Prisma data and upserts it |
| 8 | `recipe.presenter.ts` | turns the entity into `RecipeResponseDto` (dates as ISO strings) |
| 9 | Nest | sends the JSON |

If step 4 or 5 throws, nothing else runs: `DomainErrorFilter` answers `404 RECIPE_NOT_FOUND` or
`422 INVALID_RECIPE`.

## 4. Wiring: how a use case gets its adapters

Each port file exports an interface and a **token** (a `Symbol`), e.g. in `recipe-repository.port.ts`:

```ts
export const RECIPE_REPOSITORY = Symbol('RecipeRepository');
export interface RecipeRepository { save(recipe: Recipe): Promise<void>; findById(id: string): Promise<Recipe | null>; … }
```

The module (`recipe.module.ts`) is the only place that knows which adapter implements which port:

```ts
{ provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },          // port → adapter
{ provide: UpdateRecipeUseCase,                                             // use case built from ports
  useFactory: (recipes: RecipeRepository, clock: Clock) => new UpdateRecipeUseCase(recipes, clock),
  inject: [RECIPE_REPOSITORY, CLOCK] },
```

Use cases are plain classes (no `@Injectable()`), built by these factories. In unit tests they are built by hand
with **fakes** (`recipe-repository.fake.ts`: an in-memory `Map`), so they run in milliseconds without a database.

## 5. The domain

### Entities

- **`Recipe`** (`recipe.entity.ts`) — the heart of the app. Its data is private; you read it through getters and
  change it only through methods that enforce the rules:
  - `Recipe.create(input, now)` — new recipe: validates (title not blank, whole number of portions ≥ 1), new UUID.
  - `Recipe.restore(props)` — rebuilds a recipe read from the database, without re-validating.
  - `rename`, `changeDescription`, `changePortions`, `changeInstructions`, `changeCategory`, `changeImage`,
    `replaceIngredients`, `linkExtraction` — each one checks its rule and refreshes `updatedAt`.
  - Time comes in as a parameter (`now`, from the `Clock` port), never from `Temporal.Now`: tests choose the time.
- **`RecipeIngredient`** — one line of a recipe: name, quantity (`null` = "to taste"), unit (`null` = none),
  `isIgnoredInShoppingList`, and the ingredient **code**.
- **`RecipeAiExtraction`** (`recipe-ai-extraction.entity.ts`) — one import attempt for a link: status
  (`IN_PROGRESS`, `SUCCESS`, `ERROR`, or `MANUAL` for a recipe saved with a link but not extracted), the draft,
  the AI model and the prompt version.
- **Ingredient code** (`ingredient/domain/ingredient-code.ts`) — `" Pâte brisée "` → `"pate-brisee"`. Recipes
  share an `Ingredient` row when their codes match, and search compares codes (so "pate" finds "Pâte brisée").
- **Categories** (`recipe-category.ts`) — the 13 allowed values (`meat`, `fish`, `soup`…). The API stores a
  category, never an icon name: icons are the UI's business.

### Errors

Every business error extends `DomainError` with a stable `code` (read by the UI) and a `kind` (mapped to HTTP):

| Error | `code` | HTTP | Thrown when |
|---|---|---|---|
| `RecipeNotFoundError` | `RECIPE_NOT_FOUND` | 404 | unknown or malformed recipe id |
| `InvalidRecipeError` | `INVALID_RECIPE` | 422 | blank title, portions not a whole number ≥ 1 |
| `ExtractionNotFoundError` | `EXTRACTION_NOT_FOUND` | 404 | no successful draft cached for a link |
| `ExtractionJobNotFoundError` | `EXTRACTION_JOB_NOT_FOUND` | 404 | SSE stream asked for an unknown or expired job |
| `NotARecipeError` | `NOT_A_RECIPE` | (SSE) | Gemini says the video isn't a recipe |
| `InvalidAiOutputError` | `INVALID_AI_OUTPUT` | (SSE) | Gemini's JSON doesn't have the expected shape |
| `VideoDownloadFailedError` | `VIDEO_DOWNLOAD_FAILED` | (SSE) | yt-dlp failed (private or deleted video, timeout, file too big) |

The last three happen inside a background job: they don't become HTTP errors but an `error` message on the SSE
stream, carrying the same `code` (see §6). The UI turns each code into French text.

### Writes vs reads (CQRS-lite)

- **Repositories** (`RecipeRepository`, `AiExtractionRepository`) load and save whole entities: used by commands
  (create, update, extract).
- **Readers** (`RecipeReader`, `IngredientReader`) return lightweight read models for screens: the recipe book list
  (`RecipeSummary`, no ingredients, newest first) and the ingredient autocomplete. Cheaper queries, no entity.

## 6. The recipe import, end to end

The most complex flow. Files: `extract-recipe-draft.use-case.ts`, `in-memory-extraction-jobs.ts`,
`fetch-url-normalizer.adapter.ts`, `yt-dlp-video-downloader.adapter.ts`, `gemini-recipe-analyzer.adapter.ts`, `extracted-recipe-draft.parser.ts`,
`prompts/extract-recipe.v3.prompt.ts`, `sse-heartbeat.ts`.

```
UI ── POST /api/recipes/extract {url} ──▶ ExtractRecipeDraftUseCase.execute()
                                            1. UrlNormalizer port: short links (vm.tiktok…) followed, query dropped
                                            2. a recipe already has this link?  → { alreadyExists: true, recipeId }
                                            3. a successful draft is cached?    → job that answers it at once
                                            4. otherwise: extraction marked IN_PROGRESS, background job started
   ◀── { alreadyExists: false, jobId } ───┘    (the HTTP call returns right away)

UI ── GET /api/recipes/stream/:jobId (SSE) ──▶ the job's result, when it ends
      background job:
        VideoDownloaderPort.download  → YtDlpVideoDownloader → runs yt-dlp (+ ffmpeg) → mp4 + description
        RecipeAnalyzerPort.analyze    → GeminiRecipeAnalyzer: upload video, wait, ask with prompt v3 + JSON schema
                                        → parseExtractedRecipeDraft checks the JSON (no blind cast)
        success → extraction stored as SUCCESS (draft, model, prompt version, extractedAt)
                → SSE message { status: "success", data: draft }
        failure → extraction stored as ERROR
                → SSE message { status: "error", code: NOT_A_RECIPE | INVALID_AI_OUTPUT |
                                VIDEO_DOWNLOAD_FAILED | EXTRACTION_FAILED (anything unexpected) }
```

Details worth knowing:
- **Jobs** live in memory (`InMemoryExtractionJobs`): each one is a `ReplaySubject`, so a client that subscribes
  after the job ended still gets the result (kept 60 s). A restart loses running jobs — fine for one user.
- **Heartbeat**: while a job runs, the SSE stream sends a `ping` event every 20 s (`sse-heartbeat.ts`) so the
  reverse proxy doesn't close a silent connection (nginx's default timeout is 60 s).
- **Not leaking internals**: adapters log the real cause (HTTP status, host, stack); the client only gets a code.
- **Prompt versions**: changing the prompt means a new file (`extract-recipe.v4.prompt.ts`); the version is stored
  with each extraction, so you can tell which prompt produced a draft.
- **Saving the draft**: the user reviews it in the UI, which then calls `POST /api/recipes` with the `sourceUrl`.
  `CreateRecipeUseCase` links the recipe to its extraction (creating a `MANUAL` one for a hand-written recipe with
  a link). "Create anyway" on an already-imported link reuses the cached draft: `GET /api/recipes/extract/cached`.

## 7. Endpoints

| Method + path | Controller method | Use case | Answer |
|---|---|---|---|
| `GET /api/app/health` | `AppController.getHealth` | — | `{ status: "ok", timestamp }` |
| `GET /api/recipes?page&limit&search` | `findAll` | `GetAllRecipesUseCase` (reader) | recipe summaries, newest first (`search` not built yet) |
| `GET /api/recipes/:id` | `findOne` | `GetRecipeByIdUseCase` | full recipe, ingredients in recipe order |
| `POST /api/recipes` | `create` | `CreateRecipeUseCase` | 201 + full recipe |
| `PATCH /api/recipes/:id` | `updateRecipe` | `UpdateRecipeUseCase` | full recipe (only the fields sent change) |
| `POST /api/recipes/extract` | `requestExtraction` | `ExtractRecipeDraftUseCase` | existing recipe id, or a job id |
| `GET /api/recipes/stream/:jobId` | `streamExtraction` (SSE) | `ExtractRecipeDraftUseCase.getJobStream` | one success/error message |
| `GET /api/recipes/extract/cached?url` | `getCachedExtraction` | `GetCachedExtractionUseCase` | the cached draft |
| `GET /api/ingredients/search?q` | `IngredientController.search` | `SearchIngredientsUseCase` | matching ingredients (2+ characters) |

## 8. Persistence

- **Schema** (`prisma/schema.prisma`): `Recipe`, `RecipeIngredient` (join table with quantity, unit, `position`,
  `isIgnoredInShoppingList`), `Ingredient` (unique `code`), `RecipeAiExtraction` (one per source link),
  `PlannerSlot` (created for the planner, no code uses it yet).
- **Mappers** (`recipe.mapper.ts`) are the only place where Prisma rows and entities meet: `toDomain` rebuilds an
  entity with `Recipe.restore`, `toPersistence` turns it back into Prisma data. They also convert `Date` (Prisma)
  ↔ `Temporal.Instant` (domain): `Date` never goes further.
- **Saving a recipe** upserts it and rewrites its ingredient lines; each line `connectOrCreate`s its `Ingredient`
  by code, so "Tomate" and "tomate" share one ingredient. `position` keeps the order the user wrote.
- **Schema changes**: edit `schema.prisma`, generate a migration (`prisma migrate dev`), follow the
  `mealplan-schema-change` skill (a migration must apply on a database that already has rows).

## 9. Tests

| Command | What | Speed / needs |
|---|---|---|
| `pnpm test` | **unit**: entities, use cases with fakes, parser, presenters, pure functions | seconds, nothing |
| `pnpm test:int` | **integration**: each Prisma adapter against a real PostgreSQL | Docker |
| `pnpm test:e2e` | **HTTP** (supertest): the whole app, request → database → response (no browser); `contract.e2e-spec.ts` checks real responses against `../contracts/openapi.yaml` | Docker |

Integration and e2e start a throwaway PostgreSQL with Testcontainers (`test/setup/`), apply the migrations, and
remove it at the end; your dev database is never touched. `pnpm test:cov` enforces 80% coverage on `domain/`,
`application/` and `shared/domain/`.

## 10. Running in production

The `Dockerfile` builds two images from the same commit (published together by `docker-build.yml`, after CI):
- `mealplan-api` (`runtime` target): the compiled app and production dependencies only, runs as `node`.
- `mealplan-api-migrate` (`migrate` target): runs `docker/migrate.sh` once — if migrations are pending, dumps the
  database to `/backups`, then `prisma migrate deploy`. On the server, the API container only starts after this job
  succeeds.

## 11. Where do I look for…

| I want to… | Look at |
|---|---|
| change a business rule of a recipe | `modules/recipe/domain/recipe.entity.ts` (+ its spec) |
| add an endpoint | controller + DTO (`presentation/`), a use case (`application/`), wiring in `recipe.module.ts` |
| change what an endpoint returns | the response DTO + `recipe.presenter.ts`, `../contracts/openapi.yaml` if the route is in it (and the shared type in `../shared/types`) |
| change a database query | the Prisma adapter in `infrastructure/` + its `.int-spec.ts` |
| add a column | `prisma/schema.prisma` → migration → mapper → entity/DTO (skill `mealplan-schema-change`) |
| change the AI prompt | new `prompts/extract-recipe.v<N>.prompt.ts`, point the Gemini adapter to it |
| switch AI provider | a new adapter implementing `RecipeAnalyzerPort`, swap it in `recipe.module.ts` |
| add an error the UI understands | a `DomainError` subclass with a `code`, + the French text in the UI's `to-user-message.ts` |
| understand an HTTP status | `shared/presentation/domain-error.filter.ts` |

**Adding a use case, the usual steps**: write the use case in `application/` with only ports in its constructor →
test it with fakes → add or reuse an adapter in `infrastructure/` (+ integration test) → wire port and use case in
the module → call it from the controller with a command built from the DTO → present the result.

## 12. Known gaps

- Extraction jobs are in memory: a restart during an extraction loses it (the user starts again).
- `PlannerSlot` exists in the schema, unused: planning and shopping list are not built yet
  (see [../SPECIFICATIONS.md](../SPECIFICATIONS.md)).
