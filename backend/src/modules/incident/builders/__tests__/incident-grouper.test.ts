import { describe, it, expect, beforeEach } from "vitest";

import { IncidentGrouper } from "../incident-grouper.js";
import type { Incident } from "../../types.js";
import type { LocalizedFault } from "../../../localization/types.js";

const grouper = new IncidentGrouper();

let baseIncident: Incident;

beforeEach(() => {
  const now = new Date();

  baseIncident = {
    id: "i1",
    transformerId: "DT-1",
    boundaryFromPoleId: "P1",
    boundaryToPoleId: "P2",
    affectedPoles: ["P2", "P3", "P4"],
    confidenceScore: 0.9,
    confidenceBreakdown: [],
    isTicketCreated: true,
    detectedAt: now,
    lastLocalizedAt: now,
    updatedAt: now,
  };
});

function fault(upstream: string, downstream: string, affected: string[]): LocalizedFault {
  return {
    transformerId: "DT-1",
    upstreamPoleId: upstream,
    downstreamPoleId: downstream,
    affectedPoles: affected,
    faultKind: "SPAN",
    topologySource: "OFFICIAL",
    topologyConfidence: 1,
  };
}

describe("IncidentGrouper", () => {
  it("merges the same boundary into the existing incident", () => {
    const result = grouper.findMatchingIncident(
      { fault: fault("P1", "P2", ["P2", "P3", "P4"]), confidence: {} as never },
      [baseIncident],
    );

    expect(result.isNewIncident).toBe(false);
  });

  it("merges a heavily overlapping subtree (boundary shift during progressive detection)", () => {
    const result = grouper.findMatchingIncident(
      { fault: fault("P1", "P2", ["P2", "P3", "P4", "P5"]), confidence: {} as never },
      [baseIncident],
    );

    expect(result.isNewIncident).toBe(false);
  });

  it("creates a new incident for a disjoint fault on the same transformer", () => {
    const result = grouper.findMatchingIncident(
      { fault: fault("P9", "P10", ["P10", "P11"]), confidence: {} as never },
      [baseIncident],
    );

    expect(result.isNewIncident).toBe(true);
  });

  it("does not merge across transformers", () => {
    const result = grouper.findMatchingIncident(
      {
        fault: { ...fault("P1", "P2", ["P2", "P3"]), transformerId: "DT-2" },
        confidence: {} as never,
      },
      [baseIncident],
    );

    expect(result.isNewIncident).toBe(true);
  });
});
