import type {
  GraphNode,
  InferredConnection,
  TransformerLocation,
  PoleAttachment
} from "../types.js";

import { haversineDistance } from "../utils/distance.js";
import { TopologyConfidenceBuilder } from "./topology-confidence.builder.js";

export class PartialTopologyCompletionEngine {
  private confidenceBuilder = new TopologyConfidenceBuilder();
  private buildAdjacency(
    connections: InferredConnection[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const connection of connections) {
      if (!adjacency.has(connection.parentPoleId)) {
        adjacency.set(connection.parentPoleId, []);
      }

      if (!adjacency.has(connection.childPoleId)) {
        adjacency.set(connection.childPoleId, []);
      }

      adjacency.get(connection.parentPoleId)!.push(connection.childPoleId);

      adjacency.get(connection.childPoleId)!.push(connection.parentPoleId);
    }

    return adjacency;
  }

  private findConnectedPoles(
    poles: GraphNode[],
    officialConnections: InferredConnection[],
  ): Set<string> {
    const visited = new Set<string>();

    const firstConnection = officialConnections[0];

    if (!firstConnection) {
      return new Set();
    }

    const queue: string[] = [firstConnection.parentPoleId];

    visited.add(firstConnection.parentPoleId);

    const adjacency = this.buildAdjacency(officialConnections);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const neighbours = adjacency.get(current) ?? [];

      for (const neighbour of neighbours) {
        if (visited.has(neighbour)) {
          continue;
        }

        visited.add(neighbour);

        queue.push(neighbour);
      }
    }

    return visited;
  }

  private findNearestConnectedPole(
    disconnectedPole: GraphNode,
    poles: GraphNode[],
    connected: Set<string>,
  ): GraphNode {
    let nearest: GraphNode | null = null;

    let minimumDistance = Number.MAX_VALUE;

    for (const pole of poles) {
      if (!connected.has(pole.id)) {
        continue;
      }

      const distance = haversineDistance(
        disconnectedPole.latitude,
        disconnectedPole.longitude,
        pole.latitude,
        pole.longitude,
      );

      if (distance < minimumDistance) {
        minimumDistance = distance;

        nearest = pole;
      }
    }

    if (!nearest) {
      throw new Error("No connected pole available.");
    }

    return nearest;
  }

  private findBestAttachment(
    poles: GraphNode[],
    connected: Set<string>,
  ): PoleAttachment {
    let bestParent: GraphNode | null = null;

    let bestChild: GraphNode | null = null;

    let bestDistance = Number.MAX_VALUE;

    for (const pole of poles) {
      if (connected.has(pole.id)) {
        continue;
      }

      const nearest = this.findNearestConnectedPole(pole, poles, connected);

      const distance = haversineDistance(
        nearest.latitude,
        nearest.longitude,
        pole.latitude,
        pole.longitude,
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestParent = nearest;
        bestChild = pole;
      }
    }

    if (!bestParent || !bestChild) {
      throw new Error("Unable to determine next attachment.");
    }

    return {
      parent: bestParent,
      child: bestChild,
      distance: bestDistance,
    };
  }

  complete(
    transformer: TransformerLocation,
    poles: GraphNode[],
    officialConnections: InferredConnection[],
  ): InferredConnection[] {
    const connected = this.findConnectedPoles(poles, officialConnections);

    const inferredConnections: InferredConnection[] = [];

    while (connected.size < poles.length) {
      const attachment = this.findBestAttachment(poles, connected);

      const maxDistance = Math.max(
        ...poles.flatMap((pole) =>
          poles
            .filter((p) => p.id !== pole.id)
            .map((p) =>
              haversineDistance(
                pole.latitude,
                pole.longitude,
                p.latitude,
                p.longitude,
              ),
            ),
        ),
      );

      const connection: InferredConnection = {
        parentPoleId: attachment.parent.id,

        childPoleId: attachment.child.id,

        distance: attachment.distance,

        confidence: this.confidenceBuilder.calculate(
          attachment.distance,
          maxDistance,
        ),
      };

      inferredConnections.push(connection);

      officialConnections.push(connection);

      connected.add(attachment.child.id);
    }

    return inferredConnections;
  }
}
