# --- STAGE 1: BUILD ---
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS builder

WORKDIR /app

RUN corepack enable pnpm

# Dependency manifests first, so the install layer stays cached while only source files change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Source code, then the production build
COPY . .
RUN pnpm run build

# --- STAGE 2: WEB SERVER ---
FROM nginx:1.31.8-alpine@sha256:1ef7ca94d7879df82421428ce13bd1eaa412404953859cf7a5b6512c25e67a60

# Remove nginx's default page
RUN rm -rf /usr/share/nginx/html/*

# Angular's browser build output (dist/<project name>/browser)
COPY --from=builder /app/dist/mealplan-ui/browser /usr/share/nginx/html

# SPA routing: unknown paths fall back to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
