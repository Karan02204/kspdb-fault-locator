import type { NormalizedTelemetry } from "../types.js";

export class TelemetryBuffer {
  private queues = new Map<string, NormalizedTelemetry[]>();

  private processing = new Set<string>();
  private static readonly MAX_QUEUE_SIZE = 100;

  async enqueue<T>(
    telemetry: NormalizedTelemetry,
    processor: (telemetry: NormalizedTelemetry) => Promise<T>,
  ): Promise<T | undefined> {
    const deviceQueue = this.queues.get(telemetry.deviceId) ?? [];

    if (deviceQueue.length >= TelemetryBuffer.MAX_QUEUE_SIZE) {
      throw new Error("Telemetry buffer overflow.");
    }

    deviceQueue.push(telemetry);

    this.queues.set(telemetry.deviceId, deviceQueue);

    if (this.processing.has(telemetry.deviceId)) {
      return;
    }

    this.processing.add(telemetry.deviceId);

    try {
      while (deviceQueue.length > 0) {
        const nextTelemetry = deviceQueue.shift();

        if (!nextTelemetry) {
          continue;
        }

        const result = await processor(nextTelemetry);

        if (nextTelemetry === telemetry) {
          return result;
        }
      }
    } finally {
      this.processing.delete(telemetry.deviceId);

      this.queues.delete(telemetry.deviceId);
    }
  }
}