import { describe, it, expect } from "vitest";

import { telemetrySchema } from "../telemetry.schema.js";

describe("telemetrySchema — device payload contract (02-data-and-systems.md)", () => {
  it("accepts the snake_case field payload the devices actually send", () => {
    const result = telemetrySchema.parse({
      device_id: "KSPDB-SD07-D0112-4431",
      pole_id: "P-024431",
      event: "power_lost",
      energized: false,
      ts: "2026-07-29T02:14:07.412Z",
      seq: 88213,
      battery_mv: 3480,
      rssi: -91,
      fw: "1.4.2",
    });

    expect(result.deviceId).toBe("KSPDB-SD07-D0112-4431");
    expect(result.poleId).toBe("P-024431");
    expect(result.eventType).toBe("POWER_LOST");
    expect(result.energized).toBe(false);
    expect(result.sequenceNumber).toBe(88213);
    expect(result.batteryMv).toBe(3480);
    expect(result.rssi).toBe(-91);
    expect(result.firmwareVersion).toBe("1.4.2");
    expect(result.deviceTimestamp.toISOString()).toBe("2026-07-29T02:14:07.412Z");
  });

  it("still accepts the camelCase simulator payload", () => {
    const result = telemetrySchema.parse({
      deviceId: "KSPDB-SD07-D0112-4431",
      eventType: "HEARTBEAT",
      sequenceNumber: 3,
      deviceTimestamp: "2026-07-29T02:14:07.412Z",
      batteryMv: 3600,
      rssi: -70,
      firmwareVersion: "1.4.2",
    });

    expect(result.deviceId).toBe("KSPDB-SD07-D0112-4431");
    expect(result.eventType).toBe("HEARTBEAT");
  });

  it("defaults battery/rssi/firmware to null and timestamp to now when omitted", () => {
    const result = telemetrySchema.parse({
      device_id: "D-1",
      event: "boot",
      seq: 0,
    });

    expect(result.batteryMv).toBeNull();
    expect(result.rssi).toBeNull();
    expect(result.firmwareVersion).toBeNull();
    expect(result.deviceTimestamp).toBeInstanceOf(Date);
  });

  it("rejects a payload with no device identity", () => {
    expect(() =>
      telemetrySchema.parse({ event: "power_lost", seq: 1 }),
    ).toThrow();
  });

  it("rejects a payload with no event", () => {
    expect(() =>
      telemetrySchema.parse({ device_id: "D-1", seq: 1 }),
    ).toThrow();
  });
});
