import type {
  GraphNode,
  InferredConnection,
  TopologyValidationResult,
} from "../types.js";

export class TopologyValidator {
  validate(
    poles: GraphNode[],
    connections: InferredConnection[],
  ): TopologyValidationResult {
    const warnings: string[] = [];

    if (connections.length !== poles.length - 1) {
      warnings.push("Topology does not contain exactly n-1 connections.");
    }

    let confidence = 1;

    if (warnings.length > 0) {
      confidence -= 0.2;
    }

    return {
      valid: warnings.length === 0,
      confidence,
      warnings,
    };
  }
}