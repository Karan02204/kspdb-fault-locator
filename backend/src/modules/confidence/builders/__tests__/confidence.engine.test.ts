import { describe, it, expect } from "vitest";

import { ConfidenceEngine } from "../confidence.engine.js";
import { PoleState } from "../../../localization/types.js";
import type { LocalizedFault } from "../../../localization/types.js";

const engine = new ConfidenceEngine();

function fault(overrides: Partial<LocalizedFault> = {}): LocalizedFault {
  return {
    transformerId: "DT-1",
    upstreamPoleId: "P1",
    downstreamPoleId: "P2",
    affectedPoles: ["P2", "P3", "P4"],
    faultKind: "SPAN",
    topologySource: "OFFICIAL",
    topologyConfidence: 1,
    ...overrides,
  };
}

describe("ConfidenceEngine", () => {
  it("scores a clean, fully-observed span fault HIGH", () => {
    const result = engine.evaluate({
      fault: fault(),
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.DARK },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: fault() },
      sensorHealth: {
        poleHealth: [
          { poleId: "P2", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
          { poleId: "P3", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
          { poleId: "P4", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
        ],
      },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(0.85);
    expect(result.level).toBe("HIGH");
  });

  it("does NOT inflate confidence when affected poles are UNKNOWN (no telemetry evidence)", () => {
    // A RANGE fault is what the engine emits when the boundary passes
    // through poles with no telemetry evidence.
    const rangeFault = fault({
      faultKind: "RANGE",
      unknownGapPoles: ["P2"],
    });

    const result = engine.evaluate({
      fault: rangeFault,
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.UNKNOWN },
          { poleId: "P3", state: PoleState.UNKNOWN },
          { poleId: "P4", state: PoleState.UNKNOWN },
        ],
      },
      boundary: { fault: rangeFault },
      sensorHealth: {
        poleHealth: [
          { poleId: "P2", hasDevice: false, batteryMv: null, rssi: null, lastHeartbeatAt: null, isEnergized: null },
          { poleId: "P3", hasDevice: false, batteryMv: null, rssi: null, lastHeartbeatAt: null, isEnergized: null },
          { poleId: "P4", hasDevice: false, batteryMv: null, rssi: null, lastHeartbeatAt: null, isEnergized: null },
        ],
      },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    // Honest reading: thin evidence must stay below the incident threshold.
    expect(result.overallScore).toBeLessThan(0.7);

    // And it must be strictly lower than the same fault with observed darkness.
    const observed = engine.evaluate({
      fault: rangeFault,
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.UNKNOWN },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: rangeFault },
      sensorHealth: { poleHealth: [] },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    expect(result.overallScore).toBeLessThan(observed.overallScore);
  });

  it("penalizes darkness that comes from heartbeat silence (no power_lost packet)", () => {
    const withSilence = engine.evaluate({
      fault: fault(),
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.DARK },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: fault() },
      sensorHealth: {
        poleHealth: [
          { poleId: "P2", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: null, isEnergized: false },
          { poleId: "P3", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: null, isEnergized: false },
          { poleId: "P4", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: null, isEnergized: false },
        ],
      },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    const withCleanEvidence = engine.evaluate({
      fault: fault(),
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.DARK },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: fault() },
      sensorHealth: {
        poleHealth: [
          { poleId: "P2", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
          { poleId: "P3", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
          { poleId: "P4", hasDevice: true, batteryMv: 3700, rssi: -60, lastHeartbeatAt: new Date(), isEnergized: false },
        ],
      },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    expect(withSilence.overallScore).toBeLessThan(withCleanEvidence.overallScore);
  });

  it("scores a RANGE boundary lower than a clean span boundary", () => {
    const range = engine.evaluate({
      fault: fault({ faultKind: "RANGE", unknownGapPoles: ["P2"] }),
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.UNKNOWN },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: fault({ faultKind: "RANGE", unknownGapPoles: ["P2"] }) },
      sensorHealth: { poleHealth: [] },
      maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
    });

    expect(range.overallScore).toBeLessThan(0.9);
  });

  it("reduces the maintenance factor during an active scheduled window", () => {
    const now = new Date();

    const during = engine.evaluate({
      fault: fault(),
      telemetry: {
        affectedPoleStates: [
          { poleId: "P2", state: PoleState.DARK },
          { poleId: "P3", state: PoleState.DARK },
          { poleId: "P4", state: PoleState.DARK },
        ],
      },
      boundary: { fault: fault() },
      sensorHealth: { poleHealth: [] },
      maintenance: {
        transformerId: "DT-1",
        feederId: "F-1",
        maintenance: [
          {
            start: new Date(now.getTime() - 60_000),
            end: new Date(now.getTime() + 3_600_000),
            scope: "FEEDER",
            targetId: "F-1",
          },
        ],
      },
    });

    const maintenanceFactor = during.factors.find(
      (f) => f.type === "MAINTENANCE",
    );

    expect(maintenanceFactor?.score).toBeLessThan(1);
  });
});
