#!/bin/sh

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting backend..."
exec npm run dev