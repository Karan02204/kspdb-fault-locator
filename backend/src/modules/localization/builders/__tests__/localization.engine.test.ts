import { describe, it, expect } from "vitest";

import { LocalizationEngine } from "../localization.engine.js";
import {
  PoleState,
  type PoleStatus,
  type TopologyConnection,
} from "../../types.js";

const OFFICIAL: TopologyConnection = {
  fromPoleId: "",
  toPoleId: "",
  source: "OFFICIAL",
  confidence: 1,
};

function conn(from: string, to: string): TopologyConnection {
  return { ...OFFICIAL, fromPoleId: from, toPoleId: to };
}

function live(poleId: string): PoleStatus {
  return { poleId, state: PoleState.LIVE };
}

function dark(poleId: string): PoleStatus {
  return { poleId, state: PoleState.DARK };
}

function unknown(poleId: string): PoleStatus {
  return { poleId, state: PoleState.UNKNOWN };
}

const engine = new LocalizationEngine();

describe("LocalizationEngine — span faults", () => {
  it("localizes a simple LIVE→DARK boundary to the correct span", () => {
    const faults = engine.localize("DT-1", [conn("P1", "P2"), conn("P2", "P3")], [
      live("P1"),
      dark("P2"),
      dark("P3"),
    ]);

    expect(faults).toHaveLength(1);
    expect(faults[0]!.upstreamPoleId).toBe("P1");
    expect(faults[0]!.downstreamPoleId).toBe("P2");
    expect(faults[0]!.faultKind).toBe("SPAN");
    expect(faults[0]!.affectedPoles).toEqual(["P2", "P3"]);
  });

  it("finds two simultaneous faults on different branches", () => {
    const faults = engine.localize(
      "DT-1",
      [
        conn("P1", "P2"),
        conn("P2", "P3"),
        conn("P1", "P5"),
        conn("P5", "P6"),
      ],
      [
        live("P1"),
        dark("P2"),
        dark("P3"),
        live("P5"),
        dark("P6"),
      ],
    );

    expect(faults).toHaveLength(2);
    expect(faults.map((f) => f.downstreamPoleId).sort()).toEqual(["P2", "P6"]);
  });

  it("does NOT merge a dark pole whose subtree is live (impossible pattern = dead sensor)", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [live("P1"), dark("P2"), live("P3")],
    );

    expect(faults).toHaveLength(0);
  });
});

describe("LocalizationEngine — UNKNOWN poles", () => {
  it("reports a RANGE boundary when the pole right after LIVE is UNKNOWN and darkness is confirmed further down", () => {
    const faults = engine.localize(
      "DT-1",
      [
        conn("P1", "P2"),
        conn("P2", "P3"),
        conn("P3", "P4"),
      ],
      [live("P1"), unknown("P2"), dark("P3"), dark("P4")],
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]!.upstreamPoleId).toBe("P1");
    expect(faults[0]!.downstreamPoleId).toBe("P3");
    expect(faults[0]!.faultKind).toBe("RANGE");
    expect(faults[0]!.unknownGapPoles).toEqual(["P2"]);
    // The silent pole is included in the outage zone.
    expect(faults[0]!.affectedPoles).toEqual(["P2", "P3", "P4"]);
  });

  it("does NOT report a fault when a silent section is followed by LIVE poles (sensor issue, not an outage)", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [live("P1"), unknown("P2"), live("P3")],
    );

    expect(faults).toHaveLength(0);
  });

  it("does NOT report a fault when an UNKNOWN tail has no darkness evidence", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [live("P1"), dark("P2"), unknown("P3")],
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]!.downstreamPoleId).toBe("P2");
  });
});

describe("LocalizationEngine — whole-DT outages (evidence-based)", () => {
  it("reports one DT-level fault when every KNOWN pole is dark (>=2 reports)", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [dark("P1"), dark("P2"), dark("P3")],
    );

    expect(faults).toHaveLength(1);
    expect(faults[0]!.faultKind).toBe("DT");
    expect(faults[0]!.affectedPoles).toHaveLength(3);
  });

  it("does NOT invent an outage when every pole is UNKNOWN (fresh network)", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [unknown("P1"), unknown("P2"), unknown("P3")],
    );

    expect(faults).toHaveLength(0);
  });

  it("does NOT escalate a single dark report among many UNKNOWN poles to a DT fault", () => {
    const faults = engine.localize(
      "DT-1",
      [conn("P1", "P2"), conn("P2", "P3")],
      [unknown("P1"), dark("P2"), unknown("P3")],
    );

    expect(faults).toHaveLength(0);
  });
});
