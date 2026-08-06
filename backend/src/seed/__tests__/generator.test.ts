import { describe, it, expect } from "vitest";

import {
  buildCsvs,
  FEEDERS,
  TRANSFORMERS_PER_FEEDER,
} from "../generator.js";

describe("seed generator", () => {
  it("produces a parseable CSV pair with the expected proportions", () => {
    const { polesCsv, transformersCsv } = buildCsvs();

    const poleLines = polesCsv.trim().split("\n").slice(1);

    const transformerLines = transformersCsv.trim().split("\n").slice(1);

    const transformers = FEEDERS.length * TRANSFORMERS_PER_FEEDER;

    expect(transformerLines).toHaveLength(transformers);

    // 15 transformers × 40-80 poles ≈ 600-1200 poles.
    expect(poleLines.length).toBeGreaterThanOrEqual(600);
    expect(poleLines.length).toBeLessThanOrEqual(1250);

    // Every required column is present on every row.
    for (const line of poleLines) {
      const cols = line.split(",");

      expect(cols).toHaveLength(11);

      expect(cols[0]).toMatch(/^P-/); // pole_id
      expect(Number(cols[1])).toBeGreaterThan(10); // lat
      expect(Number(cols[2])).toBeGreaterThan(70); // lon
      expect(cols[3]).toMatch(/^F-/); // feeder_id
      expect(cols[4]).toMatch(/^D-/); // dt_id
      expect(Number.isNaN(Number(cols[1]))).toBe(false);
    }
  });

  it("generates a realistic device coverage (~91% have devices)", () => {
    const { polesCsv } = buildCsvs();

    const poleLines = polesCsv.trim().split("\n").slice(1);

    const withDevice = poleLines.filter((l) => l.split(",")[10] !== "").length;

    const ratio = withDevice / poleLines.length;

    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });

  it("generates a realistic mix of official vs missing topology", () => {
    const { polesCsv } = buildCsvs();

    const poleLines = polesCsv.trim().split("\n").slice(1);

    const withParent = poleLines.filter(
      (l) => l.split(",")[6] !== "",
    ).length;

    const withSeq = poleLines.filter((l) => l.split(",")[5] !== "").length;

    // ~40% of transformers have official ordering; poles on those
    // transformers all carry parent + seq.
    expect(withParent).toBeGreaterThan(poleLines.length * 0.3);
    expect(withParent).toBeLessThan(poleLines.length * 0.55);

    // The root pole of each official transformer has seq=1 but no parent,
    // so seq count may exceed the parent count by at most one per
    // transformer.
    expect(withSeq).toBeGreaterThanOrEqual(withParent);
    expect(withSeq - withParent).toBeLessThanOrEqual(
      FEEDERS.length * TRANSFORMERS_PER_FEEDER,
    );
  });
});
