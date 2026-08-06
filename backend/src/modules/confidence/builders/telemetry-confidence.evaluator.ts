import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault, PoleStatus } from "../../localization/types.js";

import { PoleState } from "../../localization/types.js";

export interface TelemetryEvaluationInput {
  affectedPoleStates: PoleStatus[];
}

/**
 * How much of the affected subtree has *observed* state evidence.
 *
 * UNKNOWN poles (no device, dead sensor, never heard from) are not
 * evidence of darkness and must not inflate coverage. A fault whose
 * affected poles are mostly UNKNOWN scores low, which is the honest
 * reading: we know something is dark, but not how much of the subtree.
 */
export class TelemetryConfidenceEvaluator implements ConfidenceEvaluator<TelemetryEvaluationInput> {
  evaluate(input: TelemetryEvaluationInput): ConfidenceFactor {
    const total = input.affectedPoleStates.length;

    const observed = input.affectedPoleStates.filter(
      (pole) => pole.state !== PoleState.UNKNOWN,
    ).length;

    const coverage = total === 0 ? 0 : observed / total;

    const score = Math.max(0, coverage);

    let reason: string;

    if (score >= 0.9) {
      reason = "Excellent telemetry coverage of the affected subtree.";
    } else if (score >= 0.7) {
      reason = "Good telemetry coverage of the affected subtree.";
    } else if (score >= 0.5) {
      reason = "Partial telemetry coverage of the affected subtree.";
    } else {
      reason = "Most affected poles have no observed state; darkness evidence is thin.";
    }

    return {
      type: "TELEMETRY",

      score,

      reason,
    };
  }
}
