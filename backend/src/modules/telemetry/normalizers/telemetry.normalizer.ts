import { EventType } from "../../../../generated/prisma/enums.js";

import type { NormalizedTelemetry } from "../types.js";
import  { PoleStateEvent } from "../types.js";
import type { TelemetryRequest } from "../validators/telemetry.schema.js";

export class TelemetryNormalizer {
  normalize(request: TelemetryRequest): NormalizedTelemetry {
    let event: PoleStateEvent;

    switch (request.eventType) {
      case EventType.POWER_LOST:
        event = PoleStateEvent.POLE_DARK;
        break;

      case EventType.POWER_RESTORED:
        event = PoleStateEvent.POLE_LIVE;
        break;

      case EventType.HEARTBEAT:
        event = PoleStateEvent.HEARTBEAT;
        break;

      case EventType.BOOT:
        event = PoleStateEvent.DEVICE_BOOTED;
        break;

      // HEARTBEAT_TIMEOUT is generated internally by the HeartbeatMonitor,
      // not received directly from devices.
      default:
        throw new Error(`Unsupported event type: ${request.eventType}`);
    }

    return {
      deviceId: request.deviceId,

      ...(request.poleId !== undefined ? { poleId: request.poleId } : {}),

      ...(request.energized !== undefined
        ? { energized: request.energized }
        : {}),

      event,

      sequenceNumber: request.sequenceNumber,

      deviceTimestamp: request.deviceTimestamp,

      batteryMv: request.batteryMv,

      rssi: request.rssi,

      firmwareVersion: request.firmwareVersion,

      originalEvent: request.eventType,
    };
  }
}
