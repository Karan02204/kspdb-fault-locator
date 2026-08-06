/**
 * Micro-benchmarks for the pure-logic hot paths.
 *
 * Run with: npm run bench
 *
 * These measure the algorithmic cores (localization, confidence, topology
 * completion) WITHOUT the database, so they are a lower bound on end-to-end
 * latency. End-to-end ingest/DB numbers depend on the host and are not
 * claimed here — see DECISIONS.md "Performance Validation".
 */
import { LocalizationEngine } from "../modules/localization/builders/localization.engine.js";
import { ConfidenceEngine } from "../modules/confidence/builders/confidence.engine.js";
import { PartialTopologyCompletionEngine } from "../modules/topology/builders/partial-topology-completion.engine.js";
import { IncidentGrouper } from "../modules/incident/builders/incident-grouper.js";
import {
  PoleState,
  type PoleStatus,
  type TopologyConnection,
} from "../modules/localization/types.js";
import type { LocalizedFault } from "../modules/localization/types.js";

function measure(label: string, fn: () => void, iterations = 1): number {
  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6 / iterations;

  console.log(`${label.padEnd(62)} ${elapsedMs.toFixed(2)} ms`);

  return elapsedMs;
}

// ---------------------------------------------------------------------------
// 1. Localization over a single large radial tree (240 poles, the spec max).
// ---------------------------------------------------------------------------
{
  const n = 240;

  const connections: TopologyConnection[] = [];

  for (let i = 0; i < n - 1; i++) {
    connections.push({
      fromPoleId: `P${i}`,
      toPoleId: `P${i + 1}`,
      source: "INFERRED",
      confidence: 0.85,
    });
  }

  // Fault near the middle.
  const states: PoleStatus[] = [];

  for (let i = 0; i < n; i++) {
    states.push({
      poleId: `P${i}`,
      state: i >= 120 ? PoleState.DARK : PoleState.LIVE,
    });
  }

  const engine = new LocalizationEngine();

  measure("localization: 240-pole radial tree, 1 fault", () => {
    const faults = engine.localize("DT-1", connections, states);

    if (faults.length !== 1) throw new Error("unexpected fault count");
  });

  // Burst-sized: 10 separate localization runs = 10 messages in 10 s.
  measure("localization: 240-pole tree x10 (burst of 10 messages)", () => {
    for (let i = 0; i < 10; i++) {
      engine.localize("DT-1", connections, states);
    }
  });
}

// ---------------------------------------------------------------------------
// 2. Confidence evaluation (5 evaluators) per localized fault.
// ---------------------------------------------------------------------------
{
  const engine = new ConfidenceEngine();

  const fault: LocalizedFault = {
    transformerId: "DT-1",
    upstreamPoleId: "P100",
    downstreamPoleId: "P101",
    affectedPoles: Array.from({ length: 60 }, (_, i) => `P${i + 100}`),
    faultKind: "SPAN",
    topologySource: "INFERRED",
    topologyConfidence: 0.85,
  };

  const states = fault.affectedPoles.map((id) => ({
    poleId: id,
    state: PoleState.DARK,
  }));

  measure("confidence: 60-pole affected subtree (1000 evals)", () => {
    for (let i = 0; i < 1000; i++) {
      engine.evaluate({
        fault,
        telemetry: { affectedPoleStates: states },
        boundary: { fault },
        sensorHealth: { poleHealth: [] },
        maintenance: { transformerId: "DT-1", feederId: "F-1", maintenance: [] },
      });
    }
  }, 1);
}

// ---------------------------------------------------------------------------
// 3. Incident grouping against a small set of open incidents.
// ---------------------------------------------------------------------------
{
  const grouper = new IncidentGrouper();

  const now = new Date();

  const openIncidents = Array.from({ length: 5 }, (_, i) => ({
    id: `i${i}`,
    transformerId: "DT-1",
    boundaryFromPoleId: `P${i * 10}`,
    boundaryToPoleId: `P${i * 10 + 1}`,
    affectedPoles: [`P${i * 10 + 1}`, `P${i * 10 + 2}`],
    confidenceScore: 0.9,
    confidenceBreakdown: [],
    isTicketCreated: true,
    detectedAt: now,
    lastLocalizedAt: now,
    updatedAt: now,
  }));

  const fault: LocalizedFault = {
    transformerId: "DT-1",
    upstreamPoleId: "P90",
    downstreamPoleId: "P91",
    affectedPoles: ["P91", "P92"],
    faultKind: "SPAN",
    topologySource: "OFFICIAL",
    topologyConfidence: 1,
  };

  measure("grouping: match against 5 open incidents (1000 evals)", () => {
    for (let i = 0; i < 1000; i++) {
      grouper.findMatchingIncident(
        { fault, confidence: { overallScore: 0.9 } as never },
        openIncidents,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Partial topology completion (the previously O(n^3) path).
// ---------------------------------------------------------------------------
{
  const engine = new PartialTopologyCompletionEngine();

  const poles = Array.from({ length: 240 }, (_, i) => ({
    id: `P${i}`,
    latitude: 12.968 + i * 0.00035,
    longitude: 77.594 + Math.sin(i / 7) * 0.0002,
  }));

  const official = Array.from({ length: 100 }, (_, i) => ({
    parentPoleId: `P${i}`,
    childPoleId: `P${i + 1}`,
    distance: 0,
    confidence: 1,
  }));

  measure("topology completion: 240-pole line, 100 official edges", () => {
    engine.complete(
      { id: "DT", latitude: 12.968, longitude: 77.594 },
      poles,
      official,
    );
  });
}

console.log("\nDone. Times are pure-logic, DB excluded.");
