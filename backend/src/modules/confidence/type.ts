import type { LocalizedFault } from "../localization/types.js";
import type { BoundaryEvaluationInput } from "./builders/boundary-confidence.evaluator.js";
import type { SensorHealthEvaluationInput } from "./builders/sensor-health.evaluator.js";
import type { TelemetryEvaluationInput } from "./builders/telemetry-confidence.evaluator.js";
export type ConfidenceFactorType =
  | "TOPOLOGY"
  | "BOUNDARY"
  | "TELEMETRY"
  | "SENSOR_HEALTH"
  | "MAINTENANCE";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceFactor {
  type: ConfidenceFactorType;

  score: number;

  reason: string;
}

export interface ConfidenceResult {
  overallScore: number;

  level: ConfidenceLevel;

  factors: ConfidenceFactor[];
}

export interface ConfidenceEvaluator<T> {
  evaluate(input: T): ConfidenceFactor;
}

export interface PoleHealthSnapshot {
  batteryMv: number | null;

  rssi: number | null;

  lastHeartbeatAt: Date | null;
}

export interface MaintenanceSnapshot {
  start: Date;
  end: Date;

  scope: "DT" | "FEEDER";

  targetId: string;
}

export interface MaintenanceEvaluationInput {
  transformerId: string;

  feederId: string;

  maintenance: MaintenanceSnapshot[];
}

export interface ConfidenceEngineInput {
  fault: LocalizedFault;

  telemetry: TelemetryEvaluationInput;

  boundary: BoundaryEvaluationInput;

  sensorHealth: SensorHealthEvaluationInput;

  maintenance: MaintenanceEvaluationInput;
}