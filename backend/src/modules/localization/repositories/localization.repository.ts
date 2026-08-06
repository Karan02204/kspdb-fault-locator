import { prisma } from "../../../lib/prisma.js";

import { PoleState } from "../types.js";

import type { PoleStatus, TopologyConnection } from "../types.js";

export class LocalizationRepository {
  async getPoleStatesByIds(poleIds: string[]): Promise<PoleStatus[]> {
    const poleHealth = await prisma.poleHealth.findMany({
      where: {
        poleId: {
          in: poleIds,
        },
      },
    });

    return poleHealth.map((pole: any) => ({
      poleId: pole.poleId,
      state:
        pole.isEnergized === true
          ? PoleState.LIVE
          : pole.isEnergized === false
            ? PoleState.DARK
            : PoleState.UNKNOWN,
    }));
  }

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

    return connections.map((connection: any) => ({
      fromPoleId: connection.fromPoleId,
      toPoleId: connection.toPoleId,
      source: connection.source,
      confidence: connection.confidence,
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

    return poles.map((pole: any) => ({
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