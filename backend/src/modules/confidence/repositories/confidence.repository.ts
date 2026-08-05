import { PrismaClient } from "../../../../generated/prisma/client.js";

import type { MaintenanceSnapshot, PoleHealthSnapshot } from "../type.js";

import type {
  PoleStatus,
  TopologyConnection,
} from "../../localization/types.js";

const prisma = new PrismaClient();

export class ConfidenceRepository {
  async getTopologyConnections(
    transformerId: string,
  ): Promise<TopologyConnection[]> {
    const connections = await prisma.poleConnection.findMany({
      where: {
        fromPole: {
          transformerId,
        },
      },
    });

    return connections.map((connection) => ({
      fromPoleId: connection.fromPoleId,

      toPoleId: connection.toPoleId,

      transformerId,

      source: connection.source,

      confidence: connection.confidence,
    }));
  }

  async getPoleHealthSnapshots(
    poleIds: string[],
  ): Promise<PoleHealthSnapshot[]> {
    const poleHealth = await prisma.poleHealth.findMany({
      where: {
        poleId: {
          in: poleIds,
        },

        deviceId: {
          not: null,
        },
      },
    });

    return poleHealth.map((health) => ({
      batteryMv: health.batteryMv,

      rssi: health.rssi,

      lastHeartbeatAt: health.lastHeartbeatAt,
    }));
  }

  async getMaintenanceEvents(
    transformerId: string,
  ): Promise<MaintenanceSnapshot[]> {
    const transformer = await prisma.distributionTransformer.findUnique({
      where: {
        id: transformerId,
      },

      select: {
        feederId: true,
      },
    });

    if (!transformer) {
      return [];
    }

    const maintenance = await prisma.maintenanceEvent.findMany({
      where: {
        OR: [
          {
            transformerId,
          },

          {
            feederId: transformer.feederId,
          },
        ],
      },
    });

    return maintenance.map((event) => ({
      start: event.startsAt,

      end: event.endsAt,

      scope: event.transformerId !== null ? "DT" : "FEEDER",

      targetId: event.transformerId ?? event.feederId,
    }));
  }

  async getFeederId(transformerId: string): Promise<string> {
    const transformer = await prisma.distributionTransformer.findUnique({
      where: {
        id: transformerId,
      },
      select: {
        feederId: true,
      },
    });

    if (!transformer) {
      throw new Error(`Transformer ${transformerId} not found.`);
    }

    return transformer.feederId;
  }
}
