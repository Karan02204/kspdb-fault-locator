import { z } from "zod";

export const telemetrySchema = z.object({
  deviceId: z.string().min(1),

  eventType: z.enum([
    "HEARTBEAT",
    "POWER_LOST",
    "POWER_RESTORED",
    "BOOT",
    "HEARTBEAT_TIMEOUT",
  ]),

  sequenceNumber: z.number().int().nonnegative(),

  deviceTimestamp: z.coerce.date(),

  batteryMv: z.number().nullable().default(null),

  rssi: z.number().nullable().default(null),

  firmwareVersion: z.string().nullable().default(null),
});

export type TelemetryRequest = z.infer<typeof telemetrySchema>;
