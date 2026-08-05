/*
  Warnings:

  - A unique constraint covering the columns `[deviceId,bootSession,sequenceNumber]` on the table `telemetry_events` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "telemetry_events_deviceId_sequenceNumber_key";

-- AlterTable
ALTER TABLE "pole_health" ADD COLUMN     "currentBootSession" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "telemetry_events" ADD COLUMN     "bootSession" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_events_deviceId_bootSession_sequenceNumber_key" ON "telemetry_events"("deviceId", "bootSession", "sequenceNumber");
