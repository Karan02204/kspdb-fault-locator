import type {
  ConfidenceEvaluator,
  ConfidenceFactor,
  PoleHealthSnapshot,
} from "../type";

export interface SensorHealthEvaluationInput {
  poleHealth: PoleHealthSnapshot[];
}

/**
 * How trustworthy the sensors behind a fault are.
 *
 * Rules:
 * - Poles with no device fitted are neutral (0.5): their silence tells us
 *   nothing about the fault.
 * - A pole that is DARK only because its heartbeats stopped (lastHeartbeatAt
 *   is null — heartbeat-timeout derived) is weak evidence and scores low:
 *   the outage may be a dead modem, not a dead span.
 * - Otherwise battery, RSSI and heartbeat recency are combined as usual.
 */
export class SensorHealthEvaluator implements ConfidenceEvaluator<SensorHealthEvaluationInput> {
  evaluate(input: SensorHealthEvaluationInput): ConfidenceFactor {
    const poleScores = input.poleHealth.map((health) => {
      if (!health.hasDevice) {
        return 0.5;
      }

      if (
        health.isEnergized === false &&
        health.lastHeartbeatAt === null
      ) {
        return 0.3;
      }

      const battery = this.batteryScore(health.batteryMv);

      const rssi = this.rssiScore(health.rssi);

      const heartbeat = this.heartbeatScore(health.lastHeartbeatAt);

      return (battery + rssi + heartbeat) / 3;
    });

    const score =
      poleScores.length === 0
        ? 0.5
        : poleScores.reduce((sum, value) => sum + value, 0) / poleScores.length;

    let reason: string;

    if (score >= 0.9) {
      reason = "Excellent sensor health.";
    } else if (score >= 0.75) {
      reason = "Good sensor health.";
    } else if (score >= 0.5) {
      reason = "Moderate sensor health.";
    } else {
      reason = "Poor sensor health; some darkness evidence comes from silent devices.";
    }

    return {
      type: "SENSOR_HEALTH",
      score,
      reason,
    };
  }

  private batteryScore(batteryMv: number | null): number {
    if (batteryMv === null) {
      return 0.5;
    }

    if (batteryMv >= 3600) {
      return 1.0;
    }

    if (batteryMv >= 3300) {
      return 0.8;
    }

    if (batteryMv >= 3000) {
      return 0.6;
    }

    return 0.3;
  }

  private rssiScore(rssi: number | null): number {
    if (rssi === null) {
      return 0.5;
    }

    if (rssi >= -70) {
      return 1.0;
    }

    if (rssi >= -85) {
      return 0.8;
    }

    if (rssi >= -100) {
      return 0.6;
    }

    return 0.3;
  }

  private heartbeatScore(lastHeartbeatAt: Date | null): number {
    if (lastHeartbeatAt === null) {
      return 0.5;
    }

    const now = Date.now();

    const ageMinutes = (now - lastHeartbeatAt.getTime()) / (1000 * 60);

    if (ageMinutes <= 16) {
      return 1.0;
    }

    if (ageMinutes <= 20) {
      return 0.8;
    }

    if (ageMinutes <= 30) {
      return 0.6;
    }

    return 0.3;
  }
}
