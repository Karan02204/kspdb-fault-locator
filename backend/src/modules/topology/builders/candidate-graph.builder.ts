import { haversineDistance } from "../utils/distance.js";
import type {
  CandidateGraph,
  GraphBuilderOptions,
  GraphEdge,
  GraphNode,
} from "../types.js";

const DEFAULT_OPTIONS: GraphBuilderOptions = {
  maxNeighbourDistance: 120,
  maxNeighbours: 3,
};

export class CandidateGraphBuilder {
  build(
    poles: GraphNode[],
    options: GraphBuilderOptions = DEFAULT_OPTIONS,
  ): CandidateGraph {
    const edges: GraphEdge[] = [];

    // Prevent duplicate undirected edges
    const edgeSet = new Set<string>();

    for (const pole of poles) {
      // Calculate distances to every other pole
      const neighbours = poles
        .filter((candidate) => candidate.id !== pole.id)
        .map((candidate) => ({
          node: candidate,
          distance: haversineDistance(
            pole.latitude,
            pole.longitude,
            candidate.latitude,
            candidate.longitude,
          ),
        }))
        // Engineering Constraint #1
        .filter(
          (candidate) => candidate.distance <= options.maxNeighbourDistance,
        )
        // Engineering Constraint #2
        .sort((a, b) => a.distance - b.distance)
        .slice(0, options.maxNeighbours);

      for (const neighbour of neighbours) {
        const from = pole.id < neighbour.node.id ? pole.id : neighbour.node.id;

        const to = pole.id < neighbour.node.id ? neighbour.node.id : pole.id;

        const edgeKey = `${from}:${to}`;

        if (edgeSet.has(edgeKey)) {
          continue;
        }

        edgeSet.add(edgeKey);

        edges.push({
          from,
          to,
          distance: neighbour.distance,
        });
      }
    }

    return {
      nodes: poles,
      edges,
    };
  }
}
