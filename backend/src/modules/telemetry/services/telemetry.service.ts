import { HealthStatus } from "../../../../generated/prisma/enums.js";
import { TelemetryRepository } from "../repositories/telemetry.repository.js";
import type { NormalizedTelemetry } from "../types.js";
import { PoleStateEvent } from "../types.js";

export class TelemetryService {
  private repository = new TelemetryRepository();

  async processTelemetry(telemetry: NormalizedTelemetry) {
    const device = await this.repository.findDevice(telemetry.deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    const existing = await this.repository.getPoleHealth(device.poleId);

    // Ignore duplicate or out-of-order packets
    if (
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

    return {
      success: true,
    };
  }
}
