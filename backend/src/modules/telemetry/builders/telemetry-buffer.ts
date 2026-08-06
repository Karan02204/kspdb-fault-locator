import type { NormalizedTelemetry } from "../types.js";

/**
 * Per-device serialization buffer.
 *
 * At-least-once delivery plus retries can flood a single device's queue.
 * Overflow must not 500 the device (that makes it retry harder); instead
 * the packet is dropped and counted so operators can observe the pressure.
 */
export class TelemetryBuffer {
  private queues = new Map<string, NormalizedTelemetry[]>();

  private processing = new Set<string>();
  private static readonly MAX_QUEUE_SIZE = 100;

  private overflowCount = 0;

  getOverflowCount(): number {
    return this.overflowCount;
  }

  async enqueue<T>(
    telemetry: NormalizedTelemetry,
    processor: (telemetry: NormalizedTelemetry) => Promise<T>,
  ): Promise<T | undefined> {
    const deviceQueue = this.queues.get(telemetry.deviceId) ?? [];

    if (deviceQueue.length >= TelemetryBuffer.MAX_QUEUE_SIZE) {
      this.overflowCount++;

      console.warn(
        `Telemetry buffer overflow for ${telemetry.deviceId}; dropping packet.`,
      );

      return undefined;
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
