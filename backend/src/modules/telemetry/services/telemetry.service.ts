import { EventType, HealthStatus } from "../../../../generated/prisma/enums.js";
import { TelemetryRepository } from "../repositories/telemetry.repository.js";
import type { NormalizedTelemetry } from "../types.js";
import { PoleStateEvent } from "../types.js";
import { IncidentService } from "../../incident/services/incident.service.js";
import { eventBus } from "../../events/builders/event-bus.js";

import { TicketStatus } from "../../../../generated/prisma/enums.js";
import { TicketService } from "../../incident/services/ticket.service.js";
import { IncidentRepository } from "../../incident/repositories/incident.repository.js";
import { outageDebouncer } from "../../incident/builders/outage-debouncer.js";

export class TelemetryService {
  private repository = new TelemetryRepository();
  private incidentService = new IncidentService();

  private ticketService = new TicketService();

  private incidentRepository = new IncidentRepository();

  /** Ignore a BOOT whose sequence number is not 0 (protocol violation) instead of failing the request. */
  private static readonly BOOT_SEQUENCE_MUST_BE_ZERO = true;

  async processTelemetry(telemetry: NormalizedTelemetry) {
    const device = await this.resolveDevice(telemetry);

    if (!device) {
      throw new Error("Device not found.");
    }

    const existing = await this.repository.getPoleHealth(device.poleId);

    const isBootEvent = telemetry.originalEvent === EventType.BOOT;

    const bootSession = isBootEvent
      ? (existing?.currentBootSession ?? 0) + 1
      : (existing?.currentBootSession ?? 0);

    // ------------------------------------------------------------------
    // Ordering & duplicate handling
    // ------------------------------------------------------------------
    if (
      isBootEvent &&
      TelemetryService.BOOT_SEQUENCE_MUST_BE_ZERO &&
      telemetry.sequenceNumber !== 0
    ) {
      console.warn(
        `Ignoring BOOT from ${telemetry.deviceId} with non-zero sequence ${telemetry.sequenceNumber}.`,
      );

      return { ignored: true, reason: "BOOT sequence must be 0." };
    }

    // Duplicate BOOTs within a short window (at-least-once retries) must not
    // churn boot sessions.
    if (isBootEvent && existing) {
      const now = Date.now();
      const lastReceived = existing.lastReceivedAt?.getTime() ?? 0;
      const recentlyBooted =
        existing.lastPoleStateEvent === PoleStateEvent.DEVICE_BOOTED &&
        now - lastReceived < 2 * 60 * 1000;

      if (recentlyBooted) {
        return { ignored: true };
      }
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

    // ------------------------------------------------------------------
    // Determine pole energized state
    // ------------------------------------------------------------------
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
        // Keep previous energized state unless the device tells us otherwise.
        break;
    }

    // `energized` is the device's own reading of its current state — trust
    // it over the event type when it is present.
    if (telemetry.energized !== undefined) {
      isEnergized = telemetry.energized;
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

    const transformerId = await this.repository.getTransformerIdByPoleId(
      device.poleId,
    );

    const previousIsEnergized = existing?.isEnergized ?? null;

    const stateFlipped =
      telemetry.energized !== undefined &&
      previousIsEnergized !== null &&
      previousIsEnergized !== isEnergized;

    if (telemetry.event === PoleStateEvent.POLE_DARK || (stateFlipped && isEnergized === false)) {
      // Enter the 30-second Candidate Observation Window. If the outage is
      // still present when it elapses, localization runs and (if confident)
      // an incident + ticket are created.
      outageDebouncer.schedule(transformerId, () =>
        this.incidentService.processTransformer(transformerId),
      );
    } else if (
      telemetry.event === PoleStateEvent.POLE_LIVE ||
      (stateFlipped && isEnergized === true)
    ) {
      // Power is back: cancel any pending observation window and process
      // immediately so incidents can be updated and tickets auto-verified.
      outageDebouncer.cancel(transformerId);

      outageDebouncer.cancelByPrefix(`maintenance-recheck:${transformerId}:`);

      const incidents =
        await this.incidentService.processTransformer(transformerId);

      await this.autoVerifyRestoredTickets(transformerId, incidents);
    }

    return {
      success: true,
    };
  }

  private async resolveDevice(telemetry: NormalizedTelemetry) {
    const byDeviceId = await this.repository.findDevice(telemetry.deviceId);

    if (byDeviceId) {
      return byDeviceId;
    }

    // The data contract says to trust pole_id over device_id; a device may
    // have been swapped and the registry is stale.
    if (telemetry.poleId) {
      const byPoleId = await this.repository.findDeviceByPoleId(telemetry.poleId);

      if (byPoleId) {
        return byPoleId;
      }
    }

    return null;
  }

  /**
   * When localization reports no remaining faults for a transformer, every
   * open ticket on it is restored *as measured by telemetry* — not by a
   * button click. Tickets are advanced to VERIFIED (system-verified) with
   * resolvedAt/verifiedAt stamped.
   */
  private async autoVerifyRestoredTickets(
    transformerId: string,
    currentIncidents: unknown[],
  ) {
    if (currentIncidents.length > 0) {
      return;
    }

    const tickets =
      await this.incidentRepository.findOpenTicketsByTransformer(transformerId);

    for (const ticket of tickets) {
      if (
        ticket.status === TicketStatus.VERIFIED ||
        ticket.status === TicketStatus.CLOSED
      ) {
        continue;
      }

      await this.ticketService.verifyFromTelemetry(ticket.id);
    }
  }
}
