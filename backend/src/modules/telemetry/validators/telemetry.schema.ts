import { z } from "zod";

/**
 * Ingest schema matching the device contract in `02-data-and-systems.md`:
 *
 * ```json
 * {
 *   "device_id": "KSPDB-SD07-D0112-4431",
 *   "pole_id": "P-024431",
 *   "event": "power_lost",
 *   "energized": false,
 *   "ts": "2026-07-29T02:14:07.412Z",
 *   "seq": 88213,
 *   "battery_mv": 3480,
 *   "rssi": -91,
 *   "fw": "1.4.2"
 * }
 * ```
 *
 * The simulator and internal callers use the camelCase form; both are
 * accepted and normalized to a single canonical shape.
 */
const eventValues = [
  "HEARTBEAT",
  "POWER_LOST",
  "POWER_RESTORED",
  "BOOT",
  "HEARTBEAT_TIMEOUT",
] as const;

const rawEventValues = [
  "heartbeat",
  "power_lost",
  "power_restored",
  "boot",
] as const;

export const telemetrySchema = z
  .object({
    deviceId: z.string().min(1).optional(),
    device_id: z.string().min(1).optional(),
    poleId: z.string().min(1).optional(),
    pole_id: z.string().min(1).optional(),
    eventType: z.enum(eventValues).optional(),
    event: z.enum(rawEventValues).optional(),
    energized: z.boolean().optional(),
    sequenceNumber: z.number().int().nonnegative().optional(),
    seq: z.number().int().nonnegative().optional(),
    deviceTimestamp: z.coerce.date().optional(),
    ts: z.coerce.date().optional(),
    batteryMv: z.number().nullable().optional(),
    battery_mv: z.number().nullable().optional(),
    rssi: z.number().nullable().optional(),
    firmwareVersion: z.string().nullable().optional(),
    fw: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.deviceId && !data.device_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either deviceId or device_id is required.",
      });
    }

    if (!data.eventType && !data.event) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either eventType or event is required.",
      });
    }
  })
  .transform((data): TelemetryRequest => {
    const poleId = data.poleId ?? data.pole_id;

    const energized = data.energized;

    return {
      deviceId: data.deviceId ?? data.device_id!,
      ...(poleId !== undefined ? { poleId } : {}),
      eventType: data.eventType ?? mapRawEvent(data.event!),
      ...(energized !== undefined ? { energized } : {}),
      sequenceNumber: data.sequenceNumber ?? data.seq ?? 0,
      deviceTimestamp: data.deviceTimestamp ?? data.ts ?? new Date(),
      batteryMv: data.batteryMv ?? data.battery_mv ?? null,
      rssi: data.rssi ?? null,
      firmwareVersion: data.firmwareVersion ?? data.fw ?? null,
    };
  });

function mapRawEvent(event: "heartbeat" | "power_lost" | "power_restored" | "boot"): EventTypeValue {
  switch (event) {
    case "heartbeat":
      return "HEARTBEAT";
    case "power_lost":
      return "POWER_LOST";
    case "power_restored":
      return "POWER_RESTORED";
    case "boot":
      return "BOOT";
  }
}

type EventTypeValue = (typeof eventValues)[number];

export interface TelemetryRequest {
  deviceId: string;
  poleId?: string;
  eventType: EventTypeValue;
  energized?: boolean;
  sequenceNumber: number;
  deviceTimestamp: Date;
  batteryMv: number | null;
  rssi: number | null;
  firmwareVersion: string | null;
}

export type TelemetryRequestInput = z.input<typeof telemetrySchema>;
