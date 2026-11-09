# How the UI works

A guided tour of the code as it is now (2026-10-09): how the app is organised, how data gets from the API to the
screen, and how each page works. The rules themselves are in [CLAUDE.md](CLAUDE.md); this file explains the code
that follows them.

## 1. The big picture: pages, features, shared

The front has **no hexagonal layers**: business rules live in the API. It is organised by **who decides**:

```
  pages/            routed screens: load data, decide (navigate, toast, save), compose components
    │  passes data down with input(), listens to output() events
    ▼
  features/<name>/  one folder per business area (recipe, extract-recipe, ingredient):
    data-access/    the ONLY code that calls the API
    model/          types mirroring the API, pure functions (mappers, schema, rules)
    ui/             display components: get data via input(), report events via output()
    │
    ▼
  shared/ui/        generic building blocks (icon, error/empty states, field errors) and app-wide UI state
  core/             app-wide plumbing: every API URL, error → French message
```

- A **page** is smart: it reads route parameters, loads data through a data-access service, handles saving,
  navigation and toasts.
- A **feature component** is (mostly) dumb: `recipe-card` receives a recipe and emits "clicked"; it never calls the
  API itself. Exception: `recipe-editor`'s ingredient autocomplete calls `IngredientApi` directly, rather than
  sending every keystroke up to the page.
- Data flows down (`input()`), events flow up (`output()`).

## 2. Folder map

```
src/
  main.ts                          bootstraps App with app.config.ts
  styles.css                       Tailwind + DaisyUI (themes declared here)
  app/
    app.config.ts                  providers: router (route params → inputs), HttpClient
    app.routes.ts                  routes, all lazy-loaded
    dev-routes.ts / .prod.ts       /ui-kit in dev builds only (the prod build swaps in the empty file)
    app.ts / app.html / app.scss   the shell: sidebar or header + bottom nav, FAB, import modal, toasts
    core/
      config/api.routes.ts         every API URL (nothing else writes a URL)
      http/to-user-message.ts      any error → French text (by API `code`, then by HTTP status)
      http/api-error.ts            an error with a `code` that didn't come from an HTTP response (SSE)
    features/
      recipe/
        data-access/recipe-api.ts  list, get, create, update recipes
        model/                     API types, categories (labels + icons), the recipe form (type, schema, mappers)
        ui/recipe-card/            one card of the book
        ui/recipe-editor/          the recipe form's fields (used by the edit page and the import modal)
      extract-recipe/
        data-access/extractor-api.ts  start an extraction, follow its SSE stream, get a cached draft
        model/                     extraction types, supported-link check
        ui/extractor-form/         the "paste a link" form
      ingredient/
        data-access/ingredient-api.ts  ingredient search (autocomplete)
        model/                     Ingredient type
    pages/
      recipe-book/                 /recipes
      recipe-detail/               /recipes/:id
      recipe-edit/                 /recipes/:id/edit
      import-recipe/               the import modal (not a route: shown by the shell)
      ui-kit/                      /ui-kit, showcase of shared components (dev only)
    shared/ui/
      icon/                        <app-icon>: the only file importing the icon library
      error-state/  empty-state/   in-page error with "Réessayer", empty list message
      field-errors/                a form field's French errors, once touched
      modal-store.ts               is the import modal open?
      theme-store.ts               current DaisyUI theme (saved in localStorage)
      toast-store.ts               toast messages (3 s each, newest on top)
  testing/host-element.ts          typed access to a test fixture's DOM
```

## 3. Startup and the shell

1. `main.ts` boots `App` with `app.config.ts`: the router (with `withComponentInputBinding()`, so a route parameter
   like `:id` arrives as the page's `id` input) and `HttpClient`.
2. `App` (`app.ts` / `app.html`) draws the shell around the routed page:
   - desktop: a sidebar (navigation + theme select); phone: a header with a theme menu and a bottom nav;
   - `<router-outlet>`: where pages appear;
   - the "+" button (phone) that opens the import modal;
   - the import modal itself, inside `@defer (when modalStore.isImportOpen(); prefetch on idle)`: its code (the
     editor, forms, drag & drop) is a separate download, fetched when the browser is idle, so it stays out of the
     initial bundle;
   - the toast area, fed by `ToastStore`.
3. Routes (`app.routes.ts`): `/` → `/recipes`; `/recipes` (book); `/recipes/:id` (detail); `/recipes/:id/edit`;
   `/ui-kit` (dev only); anything else → `/recipes`. Each page is lazy-loaded (`loadComponent`).

The app is **zoneless**: the screen updates when a **signal** it reads changes, not after any event. So all state
is in signals; a plain field changed in a callback would not show.

## 4. State: the signal toolbox

| Tool | Used for | Example |
|---|---|---|
| `signal()` | a value that changes | `ingredientOrder` on the recipe page |
| `computed()` | a value derived from others | sorted ingredients, `hasMore` in the book |
| `linkedSignal()` | a value derived from another, that can also be set | the form model, reset when a recipe loads |
| `httpResource()` | loading API data as signals | `recipe.value()`, `recipe.isLoading()`, `recipe.error()` |
| a small store service | state shared by distant components | `ModalStore`, `ThemeStore`, `ToastStore` |

`httpResource` is the standard way to **read**: you give it a function returning the URL, it fetches, and fetches
again whenever a signal read in that function changes (e.g. the route `id`). **Writes** (create, update) use
`HttpClient` and return an Observable, turned into a Promise where a form needs one.

`RecipeApi.revision` is a counter incremented after each recipe creation: the recipe book watches it to show the
new recipe without the two components knowing each other.

## 5. Talking to the API

- Every URL comes from `core/config/api.routes.ts` and starts with `/api`. In dev, `ng serve` forwards `/api` to
  `localhost:3000` (`proxy.conf.json`); in production the server's reverse proxy does. So the code never contains a
  host name.
- The three data-access services:

| Service | Method | Kind | Endpoint |
|---|---|---|---|
| `RecipeApi` | `list(page, limit)` | resource | `GET /api/recipes?page&limit` |
| | `getById(id)` | resource | `GET /api/recipes/:id` |
| | `createRecipe(payload)` | Observable | `POST /api/recipes` (bumps `revision`) |
| | `update(id, payload)` | Observable | `PATCH /api/recipes/:id` |
| `ExtractorApi` | `extractFromUrl(url)` | Observable | `POST /api/recipes/extract`, then the SSE stream |
| | `getCachedExtraction(url)` | Observable | `GET /api/recipes/extract/cached?url` |
| `IngredientApi` | `searchIngredients(term)` | Observable | `GET /api/ingredients/search?q` |

- Types in `features/*/model/*.type.ts` mirror the API's response DTOs; `RecipePayload` is the save body.

### Errors

One function turns any error into French: `toUserMessage(error)` (`core/http/to-user-message.ts`).
1. An API error body with a known `code` (`RECIPE_NOT_FOUND`, `INVALID_RECIPE`…) → its own message.
2. An `ApiError` from the extraction stream (`NOT_A_RECIPE`, `VIDEO_DOWNLOAD_FAILED`, `CONNECTION_LOST`…) → its message.
3. Otherwise by HTTP status (0 = server unreachable, 404, 5xx) or a generic message.

How errors are shown: a failed **read** shows `<app-error-state>` inside the page with a "Réessayer" button; a
failed **write** shows a toast and keeps what the user typed.

## 6. The pages

### Recipe book — `pages/recipe-book/` (`/recipes`)

- Loads pages of 25 recipes with `recipeApi.list(...)`. A `linkedSignal` (`book`) accumulates them: page 1 replaces
  the list, later pages are appended, a re-fetched page 1 (after an import) is merged on top. Recipes already shown
  are skipped (pages are fetched by offset, so a new recipe shifts them).
- **Infinite scroll**: an invisible sentinel `<div>` at the bottom is watched by an `IntersectionObserver`. After
  each rendered page the sentinel is observed again, so a screen taller than one page keeps loading, and a page
  that pushes the sentinel off screen stops it.
- States: skeleton on first load, the cards, an empty state with an import button, an error state, and a spinner
  or "Fin du carnet" at the bottom.

### Recipe detail — `pages/recipe-detail/` (`/recipes/:id`)

- `id` arrives as an input from the route; `recipeApi.getById(this.id)` loads the recipe and reloads if the id
  changes.
- Ingredients: a `signal` holds the chosen order ("Ordre de la recette" or "A→Z"); a `computed` returns them sorted
  in French (accents ignored) when asked.
- Skeleton → content, or an error state (404 → "Élément introuvable."). "Éditer" only shows once loaded.

### Recipe edit — `pages/recipe-edit/` (`/recipes/:id/edit`)

- Loads the recipe like the detail page; the **page owns the form** (see §7) and the editor only renders it.
- Saving: `update()` → toast "Modifications enregistrées !" → back to the recipe. On failure: an error toast, the
  values stay, and saving again works.

### Import modal — `pages/import-recipe/`

Not a route: the shell shows it when `ModalStore.isImportOpen()` is true. A `status` signal drives what's on screen:

```
idle / error ── paste a link (extractor-form) ──▶ loading ──▶ success: the editor with the draft
     │                                               │
     └── "Créer manuellement" ──▶ success: the editor, empty     └──▶ already_exists: "Lien déjà utilisé"
                                                                       ├─ "Consulter" → the existing recipe
                                                                       └─ "Créer quand même" → cached draft → editor
```

- `ExtractorApi.extractFromUrl` posts the link; if a job starts, it opens an `EventSource` on the SSE stream and
  waits for the one message: `success` (the draft) or `error` (its code → `ApiError` → French toast). A lost
  connection gives `CONNECTION_LOST`.
- The draft fills the form (`draftToFormModel`); saving calls `createRecipe` with the source link, shows a toast,
  closes the modal, and the book shows the new recipe on top (through `RecipeApi.revision`).

## 7. Forms (Signal Forms)

Both the edit page and the import modal use the same pieces, in `features/recipe/model/`:

- `recipe-form.type.ts` — `RecipeFormModel`, the form's shape (empty text = `''`, unknown quantity = `null`).
- `recipe-form.schema.ts` — the rules, same as the API's, with French messages: title not blank, whole number of
  portions ≥ 1, ingredient name required, quantity ≥ 0, at least one non-empty step.
- `recipe-form.mapper.ts` — `toFormModel(recipe)` and `draftToFormModel(draft)` to fill the form,
  `toPayload(model)` to build the save body (`''` back to `null`, so "no unit" is never saved as a unit).

How they fit:
```ts
// in the page
private readonly model = linkedSignal(() => toFormModel(this.recipe.value()));  // reset when the recipe loads
protected readonly recipeForm = form(this.model, recipeFormSchema, { submission: { action: … } });
```
```html
<form [formRoot]="recipeForm">                         <!-- handles submit, runs `action` only if valid -->
  <app-recipe-editor [recipeForm]="recipeForm" />      <!-- binds inputs with [formField] -->
</form>
```
`recipe-editor` binds each input with `[formField]`, shows errors with `<app-field-errors>` once a field is
touched, adds/removes rows with `value.update(...)`, reorders steps by drag & drop, and runs the debounced
ingredient search. `extractor-form` has its own one-field form for the link (`isSupportedVideoUrl`).

## 8. Shared UI and styling

- **Icons**: only `<app-icon name="…">`; `shared/ui/icon/icon.ts` is the only file importing `@ng-icons`. A recipe
  stores a `category`; `features/recipe/model/recipe-category.ts` maps it to a French label and an icon.
- **DaisyUI + Tailwind** for every style; a pattern repeated three times becomes a `shared/ui/` component.
  Themes are picked in the shell and saved by `ThemeStore`.
- **Mobile-first**: designed for the phone, then adapted with `sm:` / `md:` / `lg:` breakpoints.
- UI text is French; code and comments English.

## 9. Tests

- `pnpm test` runs Vitest in jsdom (a simulated browser); `pnpm test:cov` requires 80% coverage.
- Specs sit next to their file and test what the user sees or what is sent: pure functions directly, services
  through `HttpTestingController`, components and pages through their DOM (`hostElement(fixture)`).
- Pages are tested through the router (`RouterTestingHarness`) so route inputs work like in the app.
- Good to know: while an `httpResource` request is pending, `fixture.whenStable()` waits forever: specs use
  `TestBed.tick()` until the request is flushed. jsdom has no `IntersectionObserver` or `EventSource`: specs pass
  fakes.

## 10. Build and production

- `pnpm build` makes the production build: warns over a 500 kB initial bundle (currently ~475 kB), fails over 1 MB;
  `dev-routes.ts` is replaced by an empty file, so `/ui-kit` doesn't ship.
- The Docker image is nginx serving the built files; the server's reverse proxy sends `/api` to the API and
  everything else to it. Unknown paths fall back to `index.html` so Angular handles the route.

## 11. Where do I look for…

| I want to… | Look at |
|---|---|
| change what a page shows | `pages/<page>/<page>.html` (+ its `.ts` for the data) |
| change a recipe card / the editor | `features/recipe/ui/recipe-card/`, `features/recipe/ui/recipe-editor/` |
| call a new endpoint | its URL in `core/config/api.routes.ts`, a method in the feature's `data-access/`, the type in `model/` |
| change a form rule or message | `features/recipe/model/recipe-form.schema.ts` (keep it in step with the API) |
| change an error message | `core/http/to-user-message.ts` |
| add an icon | the map in `shared/ui/icon/icon.ts` |
| add a category | `features/recipe/model/recipe-category.ts` (and the API's list) |
| add a page | a folder in `pages/`, a lazy route in `app.routes.ts`, a link in `app.html` |
| show a toast | inject `ToastStore`, call `success()` / `error()` |
