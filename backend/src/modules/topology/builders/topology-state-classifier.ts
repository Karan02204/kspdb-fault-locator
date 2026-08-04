import { TopologyCompletenessChecker } from "./topology-completeness-checker.js";

import { TopologyState } from "../types.js";

import type { GraphNode, InferredConnection } from "../types.js";

export class TopologyStateClassifier {
  private completenessChecker = new TopologyCompletenessChecker();

  classify(
    poles: GraphNode[],
    officialConnections: InferredConnection[],
  ): TopologyState {
    if (officialConnections.length === 0) {
      return TopologyState.MISSING;
    }

    if (this.completenessChecker.isComplete(poles, officialConnections)) {
      return TopologyState.COMPLETE;
    }

    return TopologyState.PARTIAL;
  }
}
