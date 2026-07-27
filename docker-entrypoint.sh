#!/usr/bin/env sh
set -e

# Sync the schema to the database. `db push` is idempotent and safe for
# additive changes. (For production change-management with history, switch
# this to `npx prisma migrate deploy` once you adopt Prisma migrations.)
echo "→ Syncing database schema (prisma db push)…"
npx prisma db push --skip-generate

echo "→ Starting Next.js server on port 3000…"
exec npm run start
