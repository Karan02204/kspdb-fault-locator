import type { CandidateGraph, GraphEdge, MSTEdge } from "../types.js";

import { PriorityQueue } from "../utils/priority-queue.js";



export class MSTBuilder {

  private getAdjacentEdges(nodeId: string, graph: CandidateGraph): GraphEdge[] {
    return graph.edges.filter(
      (edge) => edge.from === nodeId || edge.to === nodeId,
    );
  }

  build(graph: CandidateGraph): MSTEdge[] {
    if (graph.nodes.length === 0) {
      return [];
    }

    const mst: MSTEdge[] = [];

    const visited = new Set<string>();

    const queue = new PriorityQueue<GraphEdge>();

    // Start from the first pole.
    // The tree will later be rooted at the transformer.
    const startNode = graph.nodes[0]!;

    visited.add(startNode.id);

    // Add all edges adjacent to the starting node.
    for (const edge of this.getAdjacentEdges(startNode.id, graph)) {
      queue.enqueue(edge, edge.distance);
    }

    while (!queue.isEmpty() && visited.size < graph.nodes.length) {
      const current = queue.dequeue();

      if (!current) {
        break;
      }

      const edge = current.value;

      let nextNode: string | null = null;

      if (visited.has(edge.from) && !visited.has(edge.to)) {
        nextNode = edge.to;
      } else if (visited.has(edge.to) && !visited.has(edge.from)) {
        nextNode = edge.from;
      }

      // Ignore edges that connect
      // two already-visited nodes.
      if (!nextNode) {
        continue;
      }

      mst.push({
        from: edge.from,
        to: edge.to,
        distance: edge.distance,
      });

      visited.add(nextNode);

      for (const adjacentEdge of this.getAdjacentEdges(nextNode, graph)) {
        const otherNode =
          adjacentEdge.from === nextNode ? adjacentEdge.to : adjacentEdge.from;

        if (!visited.has(otherNode)) {
          queue.enqueue(adjacentEdge, adjacentEdge.distance);
        }
      }
    }

    return mst;
  }
}
