/*
  Warnings:

  - You are about to drop the column `lastEventType` on the `pole_health` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PoleStateEvent" AS ENUM ('POLE_DARK', 'POLE_LIVE', 'HEARTBEAT', 'DEVICE_BOOTED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "pole_health" DROP COLUMN "lastEventType",
ADD COLUMN     "lastPoleStateEvent" "PoleStateEvent";
