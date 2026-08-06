import { TelemetryRepository } from "../repositories/telemetry.repository.js";

import { IncidentService } from "../../incident/services/incident.service.js";
import { HealthStatus } from "../../../../generated/prisma/enums.js";

export class HeartbeatMonitor {
  private static readonly HEARTBEAT_TIMEOUT_MINUTES = 15;

  private static readonly CHECK_INTERVAL_MS = 60 * 1000;

  private repository = new TelemetryRepository();

  private incidentService = new IncidentService();

  private timer?: NodeJS.Timeout;

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
      HeartbeatMonitor.HEARTBEAT_TIMEOUT_MINUTES,
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
    }
  }
}
