import { EventType } from "../../../../generated/prisma/enums.js";
import { PoleStateEvent } from "../../telemetry/types.js";
import type { NormalizedTelemetry } from "../../telemetry/types.js";
import { TelemetryRepository } from "../../telemetry/repositories/telemetry.repository.js";
import { TelemetryService } from "../../telemetry/services/telemetry.service.js";

export class SimulatorService {
  private repository = new TelemetryRepository();

  private telemetryService = new TelemetryService();

  private async simulate(deviceId: string, eventType: EventType) {
    const device = await this.repository.findDevice(deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    const health = await this.repository.getPoleHealth(device.poleId);

    let sequenceNumber = (health?.lastSequenceNumber ?? -1) + 1;

    let event: PoleStateEvent;

    switch (eventType) {
      case EventType.BOOT:
        sequenceNumber = 0;
        event = PoleStateEvent.DEVICE_BOOTED;
        break;

      case EventType.HEARTBEAT:
        event = PoleStateEvent.HEARTBEAT;
        break;

      case EventType.POWER_LOST:
        event = PoleStateEvent.POLE_DARK;
        break;

      case EventType.POWER_RESTORED:
        event = PoleStateEvent.POLE_LIVE;
        break;

      default:
        throw new Error("Unsupported simulator event.");
    }

    const telemetry: NormalizedTelemetry = {
      deviceId,

      event,

      originalEvent: eventType,

      sequenceNumber,

      deviceTimestamp: new Date(),

      batteryMv: health?.batteryMv ?? 3700,

      rssi: health?.rssi ?? -60,

      firmwareVersion: health?.firmwareVersion ?? "SIMULATOR",
    };

    return this.telemetryService.processTelemetry(telemetry);
  }

  async boot(deviceId: string) {
    return this.simulate(deviceId, EventType.BOOT);
  }

  async heartbeat(deviceId: string) {
    return this.simulate(deviceId, EventType.HEARTBEAT);
  }

  async powerLost(deviceId: string) {
    return this.simulate(deviceId, EventType.POWER_LOST);
  }

  async powerRestored(deviceId: string) {
    await this.simulate(deviceId, EventType.BOOT);
    await this.simulate(deviceId, EventType.POWER_RESTORED);

    return this.simulate(deviceId, EventType.HEARTBEAT);
  }

  async spanFault(upstreamDeviceId: string, downstreamDeviceId: string) {
    await this.heartbeat(upstreamDeviceId);
    return this.powerLost(downstreamDeviceId);
  }

  async transformerFault(deviceIds: string[]) {
    for (const deviceId of deviceIds) {
      await this.powerLost(deviceId);
    }

    return { success: true };
  }

  async repair(deviceIds: string[]) {
    for (const deviceId of deviceIds) {
      await this.powerRestored(deviceId);
    }

    return { success: true };
  }
}