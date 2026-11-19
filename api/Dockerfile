# Built from the repository root (`docker build -f api/Dockerfile .`): the lockfile, shared/ and contracts/ live there.
# The image keeps the repository layout (/app/api, /app/contracts) so the paths the API resolves at runtime still hold.

# --- DEPENDENCIES (shared by the build and the migrate image) ---
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS deps

WORKDIR /app

RUN corepack enable pnpm

# Workspace manifests, the shared types and the Prisma schema: the install's postinstall runs `prisma generate`
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared ./shared/
COPY api/package.json api/prisma.config.ts ./api/
COPY api/prisma ./api/prisma/

# The API's dependencies and what it builds on (shared/), from the lockfile; devDependencies hold the build tools
# and the Prisma CLI
RUN pnpm install --frozen-lockfile --filter MealPlan-API...

WORKDIR /app/api

# --- BUILD ---
FROM deps AS builder

COPY api ./
RUN pnpm run build

# Drop devDependencies (Prisma CLI included); the generated client lives in @prisma/client and stays.
# --ignore-scripts: prune would re-run postinstall (`prisma generate`), whose CLI it just removed
RUN pnpm prune --prod --ignore-scripts

# --- MIGRATE: one-shot job, applies pending migrations then exits (see docker/migrate.sh) ---
FROM deps AS migrate

# pg_dump for the pre-migration dump, same major version as the server's PostgreSQL
RUN apk add --no-cache postgresql18-client

# npm comes with the node image but nothing runs it here: one less tool and dependency tree to patch
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY api/docker/migrate.sh ./

# Unprivileged user from the node image (uid 1000): the host's dumps folder must be writable by it
USER node

CMD ["sh", "./migrate.sh"]

# --- RUNTIME (last stage: the default target) ---
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS runtime

WORKDIR /app/api

# Video download: ffmpeg merges the separate video and audio streams Instagram serves; yt-dlp is the standalone musl
# build (no Python in the image), checked against its release's checksums. Before the app files: cached across builds.
# renovate: datasource=github-releases depName=yt-dlp/yt-dlp versioning=loose
ARG YT_DLP_VERSION=2026.10.26
RUN apk add --no-cache ffmpeg \
    && cd /tmp \
    && wget -q "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp_musllinux" \
    && wget -q "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/SHA2-256SUMS" \
    && grep ' yt-dlp_musllinux$' SHA2-256SUMS | sha256sum -c - \
    && install -m 755 yt-dlp_musllinux /usr/local/bin/yt-dlp \
    && rm yt-dlp_musllinux SHA2-256SUMS

# Only what the app needs to run: no Prisma CLI, no schema (the generated client embeds it). pnpm keeps the packages
# in the workspace root's node_modules and links them from the API's own
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/api/node_modules ./node_modules
COPY --from=builder /app/api/dist ./dist
# The hand-written contract, shown at /api/docs (main.ts reads it from the repository root)
COPY contracts/openapi.yaml /app/contracts/

# npm comes with the node image but nothing runs it here: one less tool and dependency tree to patch
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

EXPOSE 3000

# Unprivileged user from the node image: the app only reads its files (copied as root) and listens on 3000
USER node

# Migrations run in the separate `migrate` job before this container starts
CMD ["node", "dist/src/main.js"]
