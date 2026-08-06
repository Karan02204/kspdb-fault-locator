import { EventType } from "../../../../generated/prisma/enums.js";
import { PoleStateEvent } from "../../telemetry/types.js";
import type { NormalizedTelemetry } from "../../telemetry/types.js";
import { TelemetryRepository } from "../../telemetry/repositories/telemetry.repository.js";
import { TelemetryService } from "../../telemetry/services/telemetry.service.js";
import { SimulatorRepository } from "../repositories/simulator.repository.js";

export interface SimulateOptions {
  /**
   * When true, outage telemetry is produced the way the field actually
   * behaves (see 02-data-and-systems.md §2):
   * - firmware 1.2 devices never send power_lost (they just go silent),
   * - ~30% of dying messages never arrive,
   * - retries can duplicate a packet,
   * - out-of-order retries arrive after a newer packet.
   */
  noise?: boolean;
}

/**
 * Fault simulator.
 *
 * Injection is *physically realistic*: a span fault darkens every pole
 * downstream of the break (not just one sensor), a DT fault darkens every
 * pole under the transformer, and a feeder fault darkens every transformer
 * on the feeder. This is what makes the demo meaningful — the system must
 * localize one boundary from many dark sensors.
 */
export class SimulatorService {
  private repository = new TelemetryRepository();

  private simulatorRepository = new SimulatorRepository();

  private telemetryService = new TelemetryService();

  private async simulate(
    deviceId: string,
    eventType: EventType,
    sequenceNumberOverride?: number,
  ) {
    const device = await this.repository.findDevice(deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    const health = await this.repository.getPoleHealth(device.poleId);

    let sequenceNumber =
      sequenceNumberOverride ?? (health?.lastSequenceNumber ?? -1) + 1;

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

  /**
   * A span fault between two adjacent poles. Darkens every pole downstream
   * of the break — the way the physics actually works.
   */
  async spanFault(
    upstreamDeviceId: string,
    downstreamDeviceId: string,
    options: SimulateOptions = {},
  ) {
    const upstreamDevice = await this.repository.findDevice(upstreamDeviceId);

    const downstreamDevice = await this.repository.findDevice(downstreamDeviceId);

    if (!upstreamDevice || !downstreamDevice) {
      throw new Error("Device not found.");
    }

    if (
      upstreamDevice.pole.transformerId !== downstreamDevice.pole.transformerId
    ) {
      throw new Error(
        "Span fault requires the upstream and downstream devices to be on the same transformer.",
      );
    }

    // Ensure the upstream pole is observed LIVE so the boundary is crisp.
    await this.heartbeat(upstreamDeviceId);

    const devices = await this.simulatorRepository.getSubtreeDevices(
      upstreamDevice.pole.transformerId,
      downstreamDevice.pole.poleId,
    );

    let darkened = 0;

    let silent = 0;

    for (const device of devices) {
      const outcome = await this.darkenDevice(device.id, options);

      darkened += outcome.darkened ? 1 : 0;

      silent += outcome.silent ? 1 : 0;
    }

    return {
      success: true,
      darkened,
      silent,
      note:
        silent > 0
          ? `${silent} device(s) went dark silently (no power_lost packet); detection relies on heartbeat timeout.`
          : undefined,
    };
  }

  async transformerFault(
    deviceIds: string[],
    options: SimulateOptions = {},
  ) {
    let darkened = 0;

    let silent = 0;

    for (const deviceId of deviceIds) {
      const outcome = await this.darkenDevice(deviceId, options);

      darkened += outcome.darkened ? 1 : 0;

      silent += outcome.silent ? 1 : 0;
    }

    return { success: true, darkened, silent };
  }

  async feederFault(feederId: string, options: SimulateOptions = {}) {
    const devices = await this.simulatorRepository.getFeederDevices(feederId);

    let darkened = 0;

    let silent = 0;

    for (const device of devices) {
      const outcome = await this.darkenDevice(device.id, options);

      darkened += outcome.darkened ? 1 : 0;

      silent += outcome.silent ? 1 : 0;
    }

    return {
      success: true,
      darkened,
      silent,
      note:
        "Feeder faults produce one localized incident per affected transformer.",
    };
  }

  /**
   * Darken a single device's pole, honouring the field's telemetry
   * unreliability when `options.noise` is set.
   */
  private async darkenDevice(
    deviceId: string,
    options: SimulateOptions,
  ): Promise<{ darkened: boolean; silent: boolean }> {
    const health = await this.repository.getPoleHealth(deviceId);

    const firmware = health?.firmwareVersion ?? "SIMULATOR";

    if (options.noise) {
      // Firmware 1.2.x devices do not send power_lost at all — they just
      // stop heartbeating. The HeartbeatMonitor is the only way the system
      // learns about these outages.
      if (firmware.startsWith("1.2")) {
        return { darkened: false, silent: true };
      }

      // ~30% of dying messages are lost to the radio.
      if (Math.random() < 0.3) {
        return { darkened: false, silent: true };
      }
    }

    await this.powerLost(deviceId);

    if (options.noise) {
      // At-least-once retry: the device retries the same packet (same seq).
      // The ingest dedup must ignore it.
      await this.simulate(deviceId, EventType.POWER_LOST, health?.lastSequenceNumber ?? 0);

      // Out-of-order: a stale retry with a LOWER seq arrives after the
      // newer packet. Must also be ignored.
      await this.simulate(deviceId, EventType.POWER_LOST, Math.max(0, (health?.lastSequenceNumber ?? 1) - 1));
    }

    return { darkened: true, silent: false };
  }

  async repair(deviceIds: string[]) {
    for (const deviceId of deviceIds) {
      await this.powerRestored(deviceId);
    }

    return { success: true };
  }

  /**
   * Simulate a device dying while the power is fine (dead modem, vandalism,
   * water ingress). The HeartbeatMonitor will flag it on its next cycle;
   * the impossible-pattern check (dark pole with live children) prevents a
   * fault ticket.
   */
  async deadDevice(deviceId: string) {
    const device = await this.repository.findDevice(deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    const timeoutMinutes = Number.parseInt(
      process.env.HEARTBEAT_TIMEOUT_MINUTES ?? "",
      10,
    );

    await this.simulatorRepository.staleDeviceHeartbeat(
      deviceId,
      Number.isFinite(timeoutMinutes) && timeoutMinutes > 0 ? timeoutMinutes : 15,
    );

    return {
      success: true,
      note: "Device marked silent; heartbeat monitor will flag it on its next cycle.",
    };
  }

  /**
   * Create a scheduled outage / maintenance window. Darkness inside the
   * window is expected and must NOT produce tickets.
   */
  async scheduleMaintenance(input: {
    scope: "FEEDER" | "DT";
    targetId: string;
    start?: string;
    end?: string;
  }) {
    const startsAt = input.start ? new Date(input.start) : new Date();

    const endsAt = input.end
      ? new Date(input.end)
      : new Date(Date.now() + 30 * 60 * 1000);

    let feederId = input.targetId;

    let transformerId: string | undefined;

    if (input.scope === "DT") {
      const transformer = await this.simulatorRepository.getTransformerFeeder(
        input.targetId,
      );

      if (!transformer) {
        throw new Error(`Transformer ${input.targetId} not found.`);
      }

      feederId = transformer.feederId;

      transformerId = input.targetId;
    }

    const event = await this.simulatorRepository.createMaintenanceEvent({
      title: input.scope === "DT" ? "Simulated DT maintenance" : "Simulated feeder load shedding",
      feederId,
      ...(transformerId !== undefined ? { transformerId } : {}),
      startsAt,
      endsAt,
    });

    return event;
  }
}
