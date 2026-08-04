import { TopologyRepository } from "../repositories/topology.repository.js";
import { FullTopologyInferenceEngine } from "../builders/full-topology-inference.engine.js";
import { TopologyCompletenessChecker } from "../builders/topology-completeness-checker.js";
import { PartialTopologyCompletionEngine } from "../builders/partial-topology-completion.engine.js";
import { TopologyStateClassifier } from "../builders/topology-state-classifier.js";
import { TopologyState } from "../types.js";

export class TopologyService {
  private repository = new TopologyRepository();

  private fullInferenceEngine = new FullTopologyInferenceEngine();
  private partialCompletionEngine = new PartialTopologyCompletionEngine();

  private stateClassifier = new TopologyStateClassifier();

  async inferMissingTopology(): Promise<void> {
    const transformers = await this.repository.getTransformers();

    for (const transformer of transformers) {
      const poles = await this.repository.getPolesForTransformer(
        transformer.id,
      );

      if (poles.length < 2) {
        continue;
      }

      const officialConnections = await this.repository.getOfficialConnections(
        transformer.id,
      );

      const state = this.stateClassifier.classify(poles, officialConnections);

      switch (state) {
        case TopologyState.COMPLETE:
          continue;

        case TopologyState.MISSING: {
          const result = this.fullInferenceEngine.infer(transformer, poles);

          await this.repository.saveInferredConnections(
            result.inferredConnections,
          );

          break;
        }

        case TopologyState.PARTIAL: {
          const inferredConnections = this.partialCompletionEngine.complete(
            transformer,
            poles,
            officialConnections,
          );

          await this.repository.saveInferredConnections(inferredConnections);

          break;
        }
      }
    }
  }
}
