/*
  Warnings:

  - You are about to drop the column `affectedPoleCount` on the `incidents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "incidents" DROP COLUMN "affectedPoleCount",
ADD COLUMN     "affectedPoles" TEXT[];
