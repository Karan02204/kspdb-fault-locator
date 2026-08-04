import { prisma } from "../../../lib/prisma.js";

import { PoleState } from "../types.js";

import type { PoleStatus, TopologyConnection } from "../types.js";

export class LocalizationRepository {
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
      source: connection.source,
    }));
  }

  async getPoleStates(transformerId: string): Promise<PoleStatus[]> {
    const poles = await prisma.pole.findMany({
      where: {
        transformerId,
      },
      include: {
        health: true,
      },
    });

    return poles.map((pole) => ({
      poleId: pole.id,

      state:
        pole.health?.isEnergized === true
          ? PoleState.LIVE
          : pole.health?.isEnergized === false
            ? PoleState.DARK
            : PoleState.UNKNOWN,
    }));
  }
}