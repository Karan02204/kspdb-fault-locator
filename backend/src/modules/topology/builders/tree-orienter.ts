import type { GraphEdge, InferredConnection, MSTEdge } from "../types.js";

export class TreeOrienter {
  orient(rootPoleId: string, mst: MSTEdge[]): InferredConnection[] {
    const adjacency = new Map<string, GraphEdge[]>();

    // Build adjacency list
    for (const edge of mst) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, []);
      }

      if (!adjacency.has(edge.to)) {
        adjacency.set(edge.to, []);
      }

      adjacency.get(edge.from)!.push(edge);
      adjacency.get(edge.to)!.push(edge);
    }

    const visited = new Set<string>();

    const queue: string[] = [rootPoleId];

    const result: InferredConnection[] = [];

    visited.add(rootPoleId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const edges = adjacency.get(current) ?? [];

      for (const edge of edges) {
        const neighbour = edge.from === current ? edge.to : edge.from;

        if (visited.has(neighbour)) {
          continue;
        }

        visited.add(neighbour);

        queue.push(neighbour);

        result.push({
          parentPoleId: current,
          childPoleId: neighbour,
          distance: edge.distance,
        });
      }
    }

    return result;
  }
}