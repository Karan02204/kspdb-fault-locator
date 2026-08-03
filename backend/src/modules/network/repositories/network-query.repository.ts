import { prisma } from "../../../lib/prisma.js";

export class NetworkQueryRepository {
  async getNetwork() {
    const [feeders, transformers, poles, devices, connections] = await Promise.all([
      prisma.feeder.findMany(),
      prisma.distributionTransformer.findMany(),
      prisma.pole.findMany(),
      prisma.device.findMany(),
      prisma.poleConnection.findMany(),
    ]);

    return {
      feeders,
      transformers,
      poles,
      devices,
      connections,
    };
  }

  async getNetworkStats() {
    const [feeders, transformers, poles, devices, connections] = await Promise.all([
      prisma.feeder.count(),
      prisma.distributionTransformer.count(),
      prisma.pole.count(),
      prisma.device.count(),
      prisma.poleConnection.count(),
    ]);

    return {
      feeders,
      transformers,
      poles,
      devices,
      connections,
    };
  }
}
