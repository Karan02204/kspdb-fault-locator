import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault, PoleStatus } from "../../localization/types.js";

import { PoleState } from "../../localization/types.js";

export interface TelemetryEvaluationInput {
  affectedPoleStates: PoleStatus[];
}

export class TelemetryConfidenceEvaluator implements ConfidenceEvaluator<TelemetryEvaluationInput> {
  evaluate(input: TelemetryEvaluationInput): ConfidenceFactor {
    const total = input.affectedPoleStates.length;

    const observed = input.affectedPoleStates.filter(
      (pole) => pole.state !== PoleState.UNKNOWN,
    ).length;

    const score = total === 0 ? 0 : observed / total;

    let reason: string;

    if (score >= 0.9) {
      reason = "Excellent telemetry coverage.";
    } else if (score >= 0.7) {
      reason = "Good telemetry coverage.";
    } else if (score >= 0.5) {
      reason = "Partial telemetry coverage.";
    } else {
      reason = "Insufficient telemetry coverage.";
    }

    return {
      type: "TELEMETRY",

      score,

      reason,
    };
  }
}
