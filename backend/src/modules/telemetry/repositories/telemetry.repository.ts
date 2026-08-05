import { EventType, HealthStatus } from "../../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

export class TelemetryRepository {
  async findDevice(deviceId: string) {
    return prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        pole: true,
      },
    });
  }

  async getTransformerIdByPoleId(poleId: string): Promise<string> {
    const pole = await prisma.pole.findUnique({
      where: {
        id: poleId,
      },
      select: {
        transformerId: true,
      },
    });

    if (!pole) {
      throw new Error(`Pole ${poleId} not found.`);
    }

    return pole.transformerId;
  }

  async getPoleHealth(poleId: string) {
    return prisma.poleHealth.findUnique({
      where: { poleId },
    });
  }

  async saveTelemetry(event: any, snapshot: any) {
    return prisma.$transaction(async (tx) => {
      await tx.telemetryEvent.create({
        data: event,
      });

      await tx.poleHealth.update({
        where: {
          poleId: snapshot.poleId,
        },
        data: snapshot,
      });
    });
  }

  async getExpiredPoleHealth(timeoutMinutes: number) {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    return prisma.poleHealth.findMany({
      where: {
        deviceId: {
          not: null,
        },

        lastHeartbeatAt: {
          not: null,
          lt: cutoff,
        },

        healthStatus: {
          not: HealthStatus.OFFLINE,
        },
      },

      include: {
        pole: {
          select: {
            transformerId: true,
          },
        },
      },
    });
  }

  async markHeartbeatTimeout(poleId: string) {
    return prisma.poleHealth.update({
      where: {
        poleId,
      },

      data: {
        healthStatus: HealthStatus.OFFLINE,

        lastHeartbeatAt: null,
      },
    });
  }

  async saveHeartbeatTimeout(poleId: string, deviceId: string) {
    const now = new Date();

    await prisma.telemetryEvent.create({
      data: {
        poleId,

        deviceId,

        eventType: EventType.HEARTBEAT_TIMEOUT,

        isEnergized: null,

        deviceTimestamp: now,

        receivedAt: now,

        sequenceNumber: -1,

        rawPayload: {
          generatedBy: "HeartbeatMonitor",
        },
      },
    });
  }

  async getPoleHealthByDeviceId(deviceId: string) {
    return prisma.poleHealth.findFirst({
      where: {
        deviceId,
      },
    });
  }
}
