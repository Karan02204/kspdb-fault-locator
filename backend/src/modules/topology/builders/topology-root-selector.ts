import { haversineDistance } from "../utils/distance.js";
import type { GraphNode } from "../types.js";
import type { TransformerLocation } from "../types.js";

export class TopologyRootSelector {
  select(transformer: TransformerLocation, poles: GraphNode[]): GraphNode {
    if (poles.length === 0) {
      throw new Error("Cannot select a root from an empty pole list.");
    }

    let closestPole = poles[0]!;

    let minimumDistance = haversineDistance(
      transformer.latitude,
      transformer.longitude,
      closestPole.latitude,
      closestPole.longitude,
    );

    for (const pole of poles.slice(1)) {
      const distance = haversineDistance(
        transformer.latitude,
        transformer.longitude,
        pole.latitude,
        pole.longitude,
      );

      if (distance < minimumDistance) {
        minimumDistance = distance;
        closestPole = pole;
      }
    }

    return closestPole;
  }
}