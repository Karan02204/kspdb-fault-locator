import type {
  ConfidenceFactor,
  ConfidenceResult,
  ConfidenceLevel,
  ConfidenceEngineInput,
} from "../type";

import { TopologyConfidenceEvaluator } from "./topology-confidence.evaluator.js";

import { TelemetryConfidenceEvaluator } from "./telemetry-confidence.evaluator.js";

import { BoundaryConfidenceEvaluator } from "./boundary-confidence.evaluator.js";

import { SensorHealthEvaluator } from "./sensor-health.evaluator.js";

import { MaintenanceEvaluator } from "./maintenance.evaluator.js";

export class ConfidenceEngine {
  constructor(
    private topologyEvaluator = new TopologyConfidenceEvaluator(),
    private telemetryEvaluator = new TelemetryConfidenceEvaluator(),
    private boundaryEvaluator = new BoundaryConfidenceEvaluator(),
    private sensorHealthEvaluator = new SensorHealthEvaluator(),
    private maintenanceEvaluator = new MaintenanceEvaluator(),
  ) {}

  evaluate(input: ConfidenceEngineInput): ConfidenceResult {
    const factors: ConfidenceFactor[] = [
      this.topologyEvaluator.evaluate(input.fault),

      this.telemetryEvaluator.evaluate(input.telemetry),

      this.boundaryEvaluator.evaluate(input.boundary),

      this.sensorHealthEvaluator.evaluate(input.sensorHealth),

      this.maintenanceEvaluator.evaluate(input.maintenance),
    ];

    const weights = {
      TOPOLOGY: 0.3,
      BOUNDARY: 0.25,
      TELEMETRY: 0.2,
      SENSOR_HEALTH: 0.15,
      MAINTENANCE: 0.1,
    };

    const overallScore = factors.reduce((total, factor) => {
      return total + factor.score * weights[factor.type];
    }, 0);

    return {
      overallScore,

      level: this.determineLevel(overallScore),

      factors,
    };
  }

  private determineLevel(score: number): ConfidenceLevel {
    if (score >= 0.85) {
      return "HIGH";
    }

    if (score >= 0.65) {
      return "MEDIUM";
    }

    return "LOW";
  }
}
