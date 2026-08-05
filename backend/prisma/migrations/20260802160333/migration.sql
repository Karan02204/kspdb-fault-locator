/*
  Warnings:

  - You are about to drop the column `deviceIdentifier` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `dtCode` on the `distribution_transformers` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `distribution_transformers` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `distribution_transformers` table. All the data in the column will be lost.
  - You are about to drop the column `feederCode` on the `feeders` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `poles` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `poles` table. All the data in the column will be lost.
  - You are about to drop the column `poleCode` on the `poles` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `substations` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `substations` table. All the data in the column will be lost.
  - Added the required column `lat` to the `distribution_transformers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `distribution_transformers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lat` to the `poles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `poles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "devices_deviceIdentifier_key";

-- DropIndex
DROP INDEX "distribution_transformers_dtCode_key";

-- DropIndex
DROP INDEX "feeders_feederCode_key";

-- DropIndex
DROP INDEX "poles_poleCode_idx";

-- DropIndex
DROP INDEX "poles_poleCode_key";

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "deviceIdentifier";

-- AlterTable
ALTER TABLE "distribution_transformers" DROP COLUMN "dtCode",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lon" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "feeders" DROP COLUMN "feederCode";

-- AlterTable
ALTER TABLE "poles" DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "poleCode",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lon" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "substations" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lon" DOUBLE PRECISION;
