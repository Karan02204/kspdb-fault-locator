import type {
  FaultBoundary,
  TopologyConnection,
  AffectedSubtree,
} from "../types.js";

export class SubtreeBuilder {
  build(
    boundary: FaultBoundary,
    connections: TopologyConnection[],
  ): AffectedSubtree {
    const adjacency = this.buildAdjacency(connections);

    const affected: string[] = [];

    const stack = [boundary.downstreamPoleId];

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current) {
        continue;
      }

      affected.push(current);

      const children = adjacency.get(current) ?? [];

      stack.push(...children);
    }

    return {
      rootPoleId: boundary.downstreamPoleId,
      affectedPoles: affected,
    };
  }

  private buildAdjacency(
    connections: TopologyConnection[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const connection of connections) {
      if (!adjacency.has(connection.fromPoleId)) {
        adjacency.set(connection.fromPoleId, []);
      }

      adjacency.get(connection.fromPoleId)!.push(connection.toPoleId);
    }

    return adjacency;
  }
}
