import type { GraphNode, InferredConnection } from "../types.js";

export class TopologyCompletenessChecker {
  isComplete(poles: GraphNode[], connections: InferredConnection[]): boolean {
    if (poles.length <= 1) {
      return true;
    }

    // A tree with n nodes must contain exactly n-1 edges.
    if (connections.length !== poles.length - 1) {
      return false;
    }

    return this.isConnected(poles, connections);
  }

  private isConnected(
    poles: GraphNode[],
    connections: InferredConnection[],
  ): boolean {
    if (poles.length === 0) {
      return true;
    }

    const adjacency = new Map<string, string[]>();

    for (const pole of poles) {
      adjacency.set(pole.id, []);
    }

    for (const connection of connections) {
      adjacency.get(connection.parentPoleId)?.push(connection.childPoleId);

      adjacency.get(connection.childPoleId)?.push(connection.parentPoleId);
    }

    const visited = new Set<string>();

    const queue: string[] = [poles[0]!.id];

    visited.add(poles[0]!.id);

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

    return visited.size === poles.length;
  }
}