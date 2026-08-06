import { prisma } from "../../../lib/prisma.js";
import { HealthStatus, MaintenanceStatus } from "../../../../generated/prisma/enums";

/**
 * Topology-aware queries used by the simulator to produce *physically
 * realistic* telemetry: a span fault darkens every pole downstream of the
 * break, a feeder fault darkens every pole under every transformer on the
 * feeder, and so on.
 */
export class SimulatorRepository {
  /** Every device on poles at or downstream of `fromPoleId` on its transformer. */
  async getSubtreeDevices(transformerId: string, fromPoleId: string) {
    const connections = await prisma.poleConnection.findMany({
      where: {
        fromPole: {
          transformerId,
        },
      },
      select: {
        fromPoleId: true,
        toPoleId: true,
      },
    });

    const childrenOf = new Map<string, string[]>();

    for (const connection of connections) {
      if (!childrenOf.has(connection.fromPoleId)) {
        childrenOf.set(connection.fromPoleId, []);
      }

      childrenOf.get(connection.fromPoleId)!.push(connection.toPoleId);
    }

    const subtreePoleIds: string[] = [];

    const stack = [fromPoleId];

    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      subtreePoleIds.push(current);

      stack.push(...(childrenOf.get(current) ?? []));
    }

    const devices = await prisma.device.findMany({
      where: {
        poleId: { in: subtreePoleIds },
      },
    });

    return devices;
  }

  async getTransformerDevices(transformerId: string) {
    return prisma.device.findMany({
      where: {
        pole: {
          transformerId,
        },
      },
    });
  }

  async getTransformerFeeder(transformerId: string) {
    return prisma.distributionTransformer.findUnique({
      where: {
        id: transformerId,
      },
      select: {
        feederId: true,
      },
    });
  }

  async getFeederDevices(feederId: string) {
    return prisma.device.findMany({
      where: {
        pole: {
          transformer: {
            feederId,
          },
        },
      },
    });
  }

  /** Force a device's last heartbeat into the past so the HeartbeatMonitor flags it. */
  async staleDeviceHeartbeat(deviceId: string, timeoutMinutes: number) {
    const cutoff = new Date(
      Date.now() - (timeoutMinutes + 2) * 60 * 1000,
    );

    return prisma.poleHealth.updateMany({
      where: {
        deviceId,
      },
      data: {
        lastHeartbeatAt: cutoff,
        // Keep it "healthy" so the monitor (which skips OFFLINE poles)
        // actually processes this one.
        healthStatus: HealthStatus.HEALTHY,
      },
    });
  }

  async createMaintenanceEvent(input: {
    title: string;
    feederId: string;
    transformerId?: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    const now = new Date();

    const status =
      now >= input.startsAt && now <= input.endsAt
        ? MaintenanceStatus.ACTIVE
        : MaintenanceStatus.PLANNED;

    return prisma.maintenanceEvent.create({
      data: {
        title: input.title,
        feederId: input.feederId,
        transformerId: input.transformerId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status,
      },
    });
  }
}
