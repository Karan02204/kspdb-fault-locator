import { CandidateGraphBuilder } from "./candidate-graph.builder.js";
import { MSTBuilder } from "./mst.builder.js";
import { TopologyRootSelector } from "./topology-root-selector.js";
import { TreeOrienter } from "./tree-orienter.js";
import { TopologyValidator } from "../validators/topology.validator.js";

import type { GraphNode, TopologyInferenceResult } from "../types.js";

import type { TransformerLocation } from "../types.js";

export class FullTopologyInferenceEngine {
  private candidateGraphBuilder = new CandidateGraphBuilder();

  private mstBuilder = new MSTBuilder();

  private rootSelector = new TopologyRootSelector();

  private treeOrienter = new TreeOrienter();

  private validator = new TopologyValidator();

  infer(
    transformer: TransformerLocation,
    poles: GraphNode[],
  ): TopologyInferenceResult {
    const graph = this.candidateGraphBuilder.build(poles);

    const mst = this.mstBuilder.build(graph);

    const root = this.rootSelector.select(transformer, graph.nodes);

    const inferredConnections = this.treeOrienter.orient(root.id, mst);

    const validation = this.validator.validate(
      graph.nodes,
      inferredConnections,
    );

    return {
      transformerId: transformer.id,
      inferredConnections,
      validation,
    };
  }
}
