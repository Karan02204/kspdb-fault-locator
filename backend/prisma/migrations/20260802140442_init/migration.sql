-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('HEARTBEAT', 'POWER_LOST', 'POWER_RESTORED', 'BOOT', 'HEARTBEAT_TIMEOUT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('DETECTED', 'ACKNOWLEDGED', 'CREW_ASSIGNED', 'RESOLVED', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConnectionSource" AS ENUM ('OFFICIAL', 'MST');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'OFFLINE', 'LOW_BATTERY', 'WEAK_SIGNAL', 'UNKNOWN', 'NO_DEVICE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "substations" (
    "id" TEXT NOT NULL,
    "substationCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeders" (
    "id" TEXT NOT NULL,
    "feederCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "substationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_transformers" (
    "id" TEXT NOT NULL,
    "dtCode" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "feederId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_transformers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poles" (
    "id" TEXT NOT NULL,
    "poleCode" TEXT NOT NULL,
    "pin" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "transformerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pole_connections" (
    "id" TEXT NOT NULL,
    "fromPoleId" TEXT NOT NULL,
    "toPoleId" TEXT NOT NULL,
    "source" "ConnectionSource" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pole_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "poleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "feederId" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "transformerId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pole_health" (
    "poleId" TEXT NOT NULL,
    "deviceId" TEXT,
    "isEnergized" BOOLEAN,
    "lastEventType" "EventType",
    "lastSequenceNumber" INTEGER,
    "lastDeviceTimestamp" TIMESTAMP(3),
    "lastReceivedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "batteryMv" INTEGER,
    "rssi" INTEGER,
    "firmwareVersion" TEXT,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pole_health_pkey" PRIMARY KEY ("poleId")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "poleId" TEXT NOT NULL,
    "deviceId" TEXT,
    "eventType" "EventType" NOT NULL,
    "isEnergized" BOOLEAN,
    "deviceTimestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequenceNumber" INTEGER NOT NULL,
    "batteryMv" INTEGER,
    "rssi" INTEGER,
    "firmwareVersion" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "transformerId" TEXT NOT NULL,
    "boundaryFromPoleId" TEXT NOT NULL,
    "boundaryToPoleId" TEXT NOT NULL,
    "affectedPoleCount" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "confidenceBreakdown" JSONB NOT NULL,
    "isTicketCreated" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "crewAssignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "substations_substationCode_key" ON "substations"("substationCode");

-- CreateIndex
CREATE UNIQUE INDEX "feeders_feederCode_key" ON "feeders"("feederCode");

-- CreateIndex
CREATE INDEX "feeders_substationId_idx" ON "feeders"("substationId");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_transformers_dtCode_key" ON "distribution_transformers"("dtCode");

-- CreateIndex
CREATE INDEX "distribution_transformers_feederId_idx" ON "distribution_transformers"("feederId");

-- CreateIndex
CREATE UNIQUE INDEX "poles_poleCode_key" ON "poles"("poleCode");

-- CreateIndex
CREATE INDEX "poles_transformerId_idx" ON "poles"("transformerId");

-- CreateIndex
CREATE INDEX "poles_poleCode_idx" ON "poles"("poleCode");

-- CreateIndex
CREATE INDEX "pole_connections_fromPoleId_idx" ON "pole_connections"("fromPoleId");

-- CreateIndex
CREATE INDEX "pole_connections_toPoleId_idx" ON "pole_connections"("toPoleId");

-- CreateIndex
CREATE UNIQUE INDEX "pole_connections_fromPoleId_toPoleId_key" ON "pole_connections"("fromPoleId", "toPoleId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceIdentifier_key" ON "devices"("deviceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "devices_poleId_key" ON "devices"("poleId");

-- CreateIndex
CREATE INDEX "maintenance_events_feederId_idx" ON "maintenance_events"("feederId");

-- CreateIndex
CREATE INDEX "maintenance_events_transformerId_idx" ON "maintenance_events"("transformerId");

-- CreateIndex
CREATE INDEX "pole_health_deviceId_idx" ON "pole_health"("deviceId");

-- CreateIndex
CREATE INDEX "telemetry_events_poleId_idx" ON "telemetry_events"("poleId");

-- CreateIndex
CREATE INDEX "telemetry_events_deviceId_idx" ON "telemetry_events"("deviceId");

-- CreateIndex
CREATE INDEX "telemetry_events_eventType_idx" ON "telemetry_events"("eventType");

-- CreateIndex
CREATE INDEX "telemetry_events_deviceTimestamp_idx" ON "telemetry_events"("deviceTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_events_deviceId_sequenceNumber_key" ON "telemetry_events"("deviceId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incidentNumber_key" ON "incidents"("incidentNumber");

-- CreateIndex
CREATE INDEX "incidents_transformerId_idx" ON "incidents"("transformerId");

-- CreateIndex
CREATE INDEX "incidents_boundaryFromPoleId_idx" ON "incidents"("boundaryFromPoleId");

-- CreateIndex
CREATE INDEX "incidents_boundaryToPoleId_idx" ON "incidents"("boundaryToPoleId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_incidentId_key" ON "tickets"("incidentId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- AddForeignKey
ALTER TABLE "feeders" ADD CONSTRAINT "feeders_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_transformers" ADD CONSTRAINT "distribution_transformers_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poles" ADD CONSTRAINT "poles_transformerId_fkey" FOREIGN KEY ("transformerId") REFERENCES "distribution_transformers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pole_connections" ADD CONSTRAINT "pole_connections_fromPoleId_fkey" FOREIGN KEY ("fromPoleId") REFERENCES "poles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pole_connections" ADD CONSTRAINT "pole_connections_toPoleId_fkey" FOREIGN KEY ("toPoleId") REFERENCES "poles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "poles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_transformerId_fkey" FOREIGN KEY ("transformerId") REFERENCES "distribution_transformers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pole_health" ADD CONSTRAINT "pole_health_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "poles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pole_health" ADD CONSTRAINT "pole_health_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "poles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_transformerId_fkey" FOREIGN KEY ("transformerId") REFERENCES "distribution_transformers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_boundaryFromPoleId_fkey" FOREIGN KEY ("boundaryFromPoleId") REFERENCES "poles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_boundaryToPoleId_fkey" FOREIGN KEY ("boundaryToPoleId") REFERENCES "poles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
