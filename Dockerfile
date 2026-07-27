# ── Base ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
# Prisma needs openssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Build ───────────────────────────────────────────────────────
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
# Placeholders so `next build` / `prisma generate` don't fail; the real
# values are injected at runtime as environment variables, never baked in.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime-000000000000"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# App + prisma CLI/engine + generated client all come from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
