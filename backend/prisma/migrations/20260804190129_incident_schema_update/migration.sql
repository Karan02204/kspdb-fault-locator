/*
  Warnings:

  - The `affectedPoleCount` column on the `incidents` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "lastLocalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "affectedPoleCount",
ADD COLUMN     "affectedPoleCount" TEXT[];

-- AlterTable
ALTER TABLE "pole_connections" ALTER COLUMN "confidence" SET DEFAULT 1.0;
