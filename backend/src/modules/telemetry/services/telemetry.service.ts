import { EventType, HealthStatus } from "../../../../generated/prisma/enums.js";
import { TelemetryRepository } from "../repositories/telemetry.repository.js";
import type { NormalizedTelemetry } from "../types.js";
import { PoleStateEvent } from "../types.js";
import { IncidentService } from "../../incident/services/incident.service.js";
import { eventBus } from "../../events/builders/event-bus.js";

import { TicketStatus } from "../../../../generated/prisma/enums.js";
import { TicketService } from "../../incident/services/ticket.service.js";
import { IncidentRepository } from "../../incident/repositories/incident.repository.js";

export class TelemetryService {
  private repository = new TelemetryRepository();
  private incidentService = new IncidentService();

  private ticketService = new TicketService();

  private incidentRepository = new IncidentRepository();

  async processTelemetry(telemetry: NormalizedTelemetry) {
    const device = await this.repository.findDevice(telemetry.deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    const existing = await this.repository.getPoleHealth(device.poleId);

    // Ignore duplicate or out-of-order packets
    const isBootEvent = telemetry.originalEvent === EventType.BOOT;

    const bootSession = isBootEvent
      ? (existing?.currentBootSession ?? 0) + 1
      : (existing?.currentBootSession ?? 0);

    if (isBootEvent && telemetry.sequenceNumber !== 0) {
      throw new Error("BOOT event must have sequence number 0.");
    }

    if (
      !isBootEvent &&
      existing &&
      existing.lastSequenceNumber !== null &&
      telemetry.sequenceNumber <= existing.lastSequenceNumber
    ) {
      return {
        ignored: true,
      };
    }

    // Determine pole energized state
    let isEnergized = existing?.isEnergized ?? null;

    switch (telemetry.event) {
      case PoleStateEvent.POLE_LIVE:
        isEnergized = true;
        break;

      case PoleStateEvent.POLE_DARK:
        isEnergized = false;
        break;

      case PoleStateEvent.HEARTBEAT:
      case PoleStateEvent.DEVICE_BOOTED:
        // Keep previous energized state
        break;
    }

    // Determine health status
    let healthStatus = existing?.healthStatus ?? HealthStatus.UNKNOWN;

    switch (telemetry.event) {
      case PoleStateEvent.HEARTBEAT:
        healthStatus = HealthStatus.HEALTHY;
        break;

      case PoleStateEvent.POLE_DARK:
        healthStatus = HealthStatus.OFFLINE;
        break;

      case PoleStateEvent.POLE_LIVE:
        healthStatus = HealthStatus.HEALTHY;
        break;

      case PoleStateEvent.DEVICE_BOOTED:
        // Don't change health yet
        break;
    }

    const now = new Date();

    await this.repository.saveTelemetry(
      {
        poleId: device.poleId,
        deviceId: device.id,

        // Store the ORIGINAL device event in history
        eventType: telemetry.originalEvent,

        isEnergized,

        deviceTimestamp: telemetry.deviceTimestamp,

        receivedAt: now,

        sequenceNumber: telemetry.sequenceNumber,

        bootSession,

        batteryMv: telemetry.batteryMv,

        rssi: telemetry.rssi,

        firmwareVersion: telemetry.firmwareVersion,

        rawPayload: {
          ...telemetry,
          receivedAt: now.toISOString(),
        },
      },

      {
        poleId: device.poleId,

        deviceId: device.id,

        isEnergized,

        // Store the ORIGINAL device event in PoleHealth too
        lastPoleStateEvent: telemetry.event,

        lastSequenceNumber: telemetry.sequenceNumber,

        currentBootSession: bootSession,

        lastDeviceTimestamp: telemetry.deviceTimestamp,

        lastReceivedAt: now,

        lastHeartbeatAt:
          telemetry.event === PoleStateEvent.HEARTBEAT
            ? now
            : (existing?.lastHeartbeatAt ?? null),

        batteryMv: telemetry.batteryMv,

        rssi: telemetry.rssi,

        firmwareVersion: telemetry.firmwareVersion,

        healthStatus,
      },
    );

    eventBus.publish("telemetry.received", {
      poleId: device.poleId,

      event: telemetry.event,

      timestamp: now,
    });

    if (
      telemetry.event === PoleStateEvent.POLE_LIVE ||
      telemetry.event === PoleStateEvent.POLE_DARK
    ) {
      const transformerId = await this.repository.getTransformerIdByPoleId(
        device.poleId,
      );

      const incidents =
        await this.incidentService.processTransformer(transformerId);

      if (
        telemetry.originalEvent === EventType.POWER_RESTORED &&
        incidents.length === 0
      ) {
        const incident =
          await this.incidentRepository.findOpenIncidentWithTicket(
            transformerId,
          );

        if (incident?.ticket) {
          await this.ticketService.updateTicketStatus(
            incident.ticket.id,
            TicketStatus.RESOLVED,
          );
        }
      }
    }

    return {
      success: true,
    };
  }
}
