import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault } from "../../localization/types.js";

export interface BoundaryEvaluationInput {
  fault: LocalizedFault;
}

export class BoundaryConfidenceEvaluator implements ConfidenceEvaluator<BoundaryEvaluationInput> {
  evaluate(input: BoundaryEvaluationInput): ConfidenceFactor {

    const depth = input.fault.affectedPoles.length;

    const score = Math.max(0.6, 1 - depth * 0.05);
    return {
      type: "BOUNDARY",

      score,

      reason: `Clear LIVE-to-DARK transition observed.`,
    };
  }
}