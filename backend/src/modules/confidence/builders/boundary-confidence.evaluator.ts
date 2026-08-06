import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault } from "../../localization/types.js";

export interface BoundaryEvaluationInput {
  fault: LocalizedFault;
}

/**
 * How certain the live→dark frontier is.
 *
 * - A clean single-span boundary is the strongest signal: HIGH.
 * - A RANGE boundary (UNKNOWN poles between the live pole and the first
 *   confirmed-dark pole) localizes the fault to a range, not a span: the
 *   exact edge is unknown, so certainty drops.
 * - A whole-DT outage (every known pole dark) is inferred from absence of
 *   any live pole; the DT/feeder is the most likely culprit but the
 *   evidence is weaker than a clean frontier, so certainty drops further.
 */
export class BoundaryConfidenceEvaluator implements ConfidenceEvaluator<BoundaryEvaluationInput> {
  evaluate(input: BoundaryEvaluationInput): ConfidenceFactor {
    const fault = input.fault;

    let score: number;

    let reason: string;

    switch (fault.faultKind) {
      case "RANGE":
        score = 0.7;

        reason = "Fault localized to a range; the exact span is unknown because boundary poles have no telemetry.";
        break;

      case "DT":
        score = 0.55;

        reason = "All poles with known state under the transformer are dark; consistent with a transformer/feeder fault but no live/dark frontier is available.";
        break;

      default:
        score = 0.95;

        reason = "Clear LIVE-to-DARK transition observed.";
        break;
    }

    return {
      type: "BOUNDARY",

      score,

      reason,
    };
  }
}
