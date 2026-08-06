import { TelemetryRepository } from "../repositories/telemetry.repository.js";

import { IncidentService } from "../../incident/services/incident.service.js";
import { HealthStatus } from "../../../../generated/prisma/enums.js";
import { outageDebouncer } from "../../incident/builders/outage-debouncer.js";

/**
 * Detects poles that went dark without ever saying so — firmware 1.2
 * devices never send `power_lost`, and ~30% of dying messages are lost.
 *
 * A heartbeat timeout is treated as *possible* darkness, not proof:
 * - The pole state is marked dark (isEnergized=false) so localization can
 *   see the outage, and the affected transformer enters the standard
 *   30-second observation window.
 * - The confidence engine penalizes faults whose darkness evidence comes
 *   from silence (see SensorHealthEvaluator), and the impossible-pattern
 *   check suppresses a dark pole whose children are still live (a dead
 *   modem, not a dead span).
 */
export class HeartbeatMonitor {
  private static readonly DEFAULT_HEARTBEAT_TIMEOUT_MINUTES = 15;

  private static readonly CHECK_INTERVAL_MS = 60 * 1000;

  private repository = new TelemetryRepository();

  private incidentService = new IncidentService();

  private timer?: NodeJS.Timeout;

  private heartbeatTimeoutMinutes: number;

  constructor() {
    const configured = Number.parseInt(
      process.env.HEARTBEAT_TIMEOUT_MINUTES ?? "",
      10,
    );

    this.heartbeatTimeoutMinutes = Number.isFinite(configured) && configured > 0
      ? configured
      : HeartbeatMonitor.DEFAULT_HEARTBEAT_TIMEOUT_MINUTES;
  }

  start() {
    this.timer = setInterval(async () => {
      await this.checkHeartbeats();
    }, HeartbeatMonitor.CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async checkHeartbeats() {
    const expiredPoleHealth = await this.repository.getExpiredPoleHealth(
      this.heartbeatTimeoutMinutes,
    );

    for (const pole of expiredPoleHealth) {
      if (pole.healthStatus === HealthStatus.OFFLINE) {
        continue;
      }
      try {
        await this.repository.saveHeartbeatTimeout(pole.poleId, pole.deviceId!);
      } catch (err) {
        console.error(err);
      }
      await this.repository.markHeartbeatTimeout(pole.poleId);

      const transformerId = pole.pole?.transformerId;

      if (transformerId) {
        outageDebouncer.schedule(transformerId, () =>
          this.incidentService.processTransformer(transformerId),
        );
      }
    }
  }
}
