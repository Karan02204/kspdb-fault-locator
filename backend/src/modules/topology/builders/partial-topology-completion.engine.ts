import type {
  GraphNode,
  InferredConnection,
  TransformerLocation,
} from "../types.js";

import { haversineDistance } from "../utils/distance.js";
import { TopologyConfidenceBuilder } from "./topology-confidence.builder.js";

/**
 * Completes a partially-known radial topology by attaching every
 * disconnected pole to the nearest already-connected pole.
 *
 * Complexity: O(n²) — the nearest-connected-pole map is maintained
 * incrementally instead of being recomputed from scratch per iteration.
 * (The previous all-pairs-recompute-per-iteration version was O(n³) and
 * took seconds even for a single 200-pole transformer.)
 */
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

  complete(
    transformer: TransformerLocation,
    poles: GraphNode[],
    officialConnections: InferredConnection[],
  ): InferredConnection[] {
    const connected = this.findConnectedPoles(poles, officialConnections);

    const inferredConnections: InferredConnection[] = [];

    // Distance scale used only to normalise the per-edge confidence.
    const maxDistance = this.maxPairwiseDistance(poles);

    // nearest[poleId] = nearest pole already connected, and its distance.
    const nearest = new Map<string, { pole: GraphNode; distance: number }>();

    const attach = (pole: GraphNode, parent: GraphNode, distance: number) => {
      inferredConnections.push({
        parentPoleId: parent.id,

        childPoleId: pole.id,

        distance,

        confidence: this.confidenceBuilder.calculate(distance, maxDistance),
      });

      connected.add(pole.id);

      // Newly connected pole may become the nearest attachment for others.
      for (const other of poles) {
        if (connected.has(other.id)) {
          continue;
        }

        const d = haversineDistance(
          pole.latitude,
          pole.longitude,
          other.latitude,
          other.longitude,
        );

        const current = nearest.get(other.id);

        if (!current || d < current.distance) {
          nearest.set(other.id, { pole, distance: d });
        }
      }
    };

    // Seed the nearest map with the official connected set.
    for (const pole of poles) {
      if (connected.has(pole.id)) {
        continue;
      }

      let best: { pole: GraphNode; distance: number } | null = null;

      for (const candidate of poles) {
        if (!connected.has(candidate.id)) {
          continue;
        }

        const d = haversineDistance(
          pole.latitude,
          pole.longitude,
          candidate.latitude,
          candidate.longitude,
        );

        if (!best || d < best.distance) {
          best = { pole: candidate, distance: d };
        }
      }

      if (best) {
        nearest.set(pole.id, best);
      }
    }

    while (connected.size < poles.length) {
      // Pick the disconnected pole closest to the connected region.
      let bestPoleId: string | null = null;

      for (const pole of poles) {
        if (connected.has(pole.id) || !nearest.has(pole.id)) {
          continue;
        }

        if (
          bestPoleId === null ||
          nearest.get(pole.id)!.distance < nearest.get(bestPoleId)!.distance
        ) {
          bestPoleId = pole.id;
        }
      }

      if (!bestPoleId) {
        // No pole is attachable (empty official set already handled by the
        // full-inference engine; nothing more we can do here).
        break;
      }

      const pole = poles.find((p) => p.id === bestPoleId)!;

      const attachment = nearest.get(pole.id)!;

      attach(pole, attachment.pole, attachment.distance);

      nearest.delete(pole.id);
    }

    return inferredConnections;
  }

  private maxPairwiseDistance(poles: GraphNode[]): number {
    let max = 0;

    for (let i = 0; i < poles.length; i++) {
      for (let j = i + 1; j < poles.length; j++) {
        const d = haversineDistance(
          poles[i]!.latitude,
          poles[i]!.longitude,
          poles[j]!.latitude,
          poles[j]!.longitude,
        );

        if (d > max) {
          max = d;
        }
      }
    }

    return max;
  }
}
