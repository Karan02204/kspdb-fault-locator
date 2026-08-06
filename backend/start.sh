#!/bin/sh

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding synthetic network (idempotent)..."
npx tsx src/seed/seed.ts

echo "Starting backend..."
exec npm run dev