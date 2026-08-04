import type { ConfidenceEvaluator, ConfidenceFactor } from "../type";

import type { LocalizedFault } from "../../localization/types.js";

export class TopologyConfidenceEvaluator implements ConfidenceEvaluator<LocalizedFault> {
  evaluate(fault: LocalizedFault): ConfidenceFactor {
    let reason: string;

    if (fault.topologyConfidence >= 0.95) {
      reason = "Official or very high-confidence topology.";
    } else if (fault.topologyConfidence >= 0.8) {
      reason = "High-confidence inferred topology.";
    } else if (fault.topologyConfidence >= 0.6) {
      reason = "Moderate-confidence inferred topology.";
    } else {
      reason = "Low-confidence inferred topology.";
    }

    return {
      type: "TOPOLOGY",

      score: fault.topologyConfidence,

      reason,
    };
  }
}
