/*
  Warnings:

  - The values [MST] on the enum `ConnectionSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConnectionSource_new" AS ENUM ('OFFICIAL', 'INFERRED');
ALTER TABLE "pole_connections" ALTER COLUMN "source" TYPE "ConnectionSource_new" USING ("source"::text::"ConnectionSource_new");
ALTER TYPE "ConnectionSource" RENAME TO "ConnectionSource_old";
ALTER TYPE "ConnectionSource_new" RENAME TO "ConnectionSource";
DROP TYPE "public"."ConnectionSource_old";
COMMIT;
