import type {
  ConfidenceEvaluator,
  ConfidenceFactor,
  MaintenanceEvaluationInput,
} from "../type";

export class MaintenanceEvaluator implements ConfidenceEvaluator<MaintenanceEvaluationInput> {
  evaluate(input: MaintenanceEvaluationInput): ConfidenceFactor {
    const now = new Date();

    const activeMaintenance = input.maintenance.find((window) => {
      const active = now >= window.start && now <= window.end;

      if (!active) {
        return false;
      }

      if (window.scope === "DT") {
        return window.targetId === input.transformerId;
      }

      return window.targetId === input.feederId;
    });

    if (activeMaintenance) {
      return {
        type: "MAINTENANCE",

        score: 0.5,

        reason: "Active scheduled maintenance overlaps the affected asset.",
      };
    }

    return {
      type: "MAINTENANCE",

      score: 1,

      reason: "No scheduled maintenance affecting the outage.",
    };
  }
}
