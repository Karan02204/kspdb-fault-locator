import { prisma } from "../../../lib/prisma.js";
import type {
  GraphNode,
  InferredConnection,
  TransformerLocation,
} from "../types.js";

export class TopologyRepository {
  async getTransformers(): Promise<TransformerLocation[]> {
    const transformers = await prisma.distributionTransformer.findMany();

    return transformers.map((transformer) => ({
      id: transformer.id,
      latitude: transformer.lat,
      longitude: transformer.lon,
    }));
  }

  async getPolesForTransformer(transformerId: string): Promise<GraphNode[]> {
    const poles = await prisma.pole.findMany({
      where: {
        transformerId,
      },
    });

    return poles.map((pole) => ({
      id: pole.id,
      latitude: pole.lat,
      longitude: pole.lon,
    }));
  }

  async getOfficialConnections(
    transformerId: string,
  ): Promise<InferredConnection[]> {
    const connections = await prisma.poleConnection.findMany({
      where: {
        source: "OFFICIAL",
        fromPole: {
          transformerId,
        },
      },
    });

    return connections.map((connection) => ({
      parentPoleId: connection.fromPoleId,
      childPoleId: connection.toPoleId,
      distance: 0, // Distance isn't needed for completeness checking.
      confidence: connection.confidence,
    }));
  }

  async saveInferredConnections(
    connections: InferredConnection[],
  ): Promise<void> {
    await prisma.poleConnection.createMany({
      data: connections.map((connection) => ({
        fromPoleId: connection.parentPoleId,
        toPoleId: connection.childPoleId,
        source: "INFERRED",
        confidence: connection.confidence,
      })),
    });
  }
}
