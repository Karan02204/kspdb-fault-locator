import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault } from "../../localization/types.js";

export interface BoundaryEvaluationInput {
  fault: LocalizedFault;
}

export class BoundaryConfidenceEvaluator implements ConfidenceEvaluator<BoundaryEvaluationInput> {
  evaluate(input: BoundaryEvaluationInput): ConfidenceFactor {
    return {
      type: "BOUNDARY",

      score: 1.0,

      reason: `Clear LIVE-to-DARK transition observed.`,
    };
  }
}