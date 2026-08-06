import { describe, it, expect } from "vitest";

import { PartialTopologyCompletionEngine } from "../partial-topology-completion.engine.js";
import type { GraphNode, InferredConnection } from "../../types.js";

function linePoles(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `P${i}`,
    latitude: 12.968 + i * 0.00035,
    longitude: 77.594 + Math.sin(i / 7) * 0.0002,
  }));
}

const engine = new PartialTopologyCompletionEngine();

describe("PartialTopologyCompletionEngine", () => {
  it("attaches every disconnected pole exactly once (n-1 edges total, connected)", () => {
    const poles = linePoles(60);

    // First 30 poles officially connected.
    const official: InferredConnection[] = Array.from({ length: 29 }, (_, i) => ({
      parentPoleId: `P${i}`,
      childPoleId: `P${i + 1}`,
      distance: 0,
      confidence: 1,
    }));

    const inferred = engine.complete(
      { id: "DT", latitude: 12.968, longitude: 77.594 },
      poles,
      official,
    );

    const totalConnections = official.length + inferred.length;

    expect(totalConnections).toBe(poles.length - 1);

    // Every pole is reachable from P0.
    const adjacency = new Map<string, string[]>();

    for (const c of [...official, ...inferred]) {
      if (!adjacency.has(c.parentPoleId)) adjacency.set(c.parentPoleId, []);
      if (!adjacency.has(c.childPoleId)) adjacency.set(c.childPoleId, []);
      adjacency.get(c.parentPoleId)!.push(c.childPoleId);
      adjacency.get(c.childPoleId)!.push(c.parentPoleId);
    }

    const visited = new Set<string>();

    const queue = ["P0"];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;

      visited.add(current);

      queue.push(...(adjacency.get(current) ?? []));
    }

    expect(visited.size).toBe(poles.length);
  });

  it("completes a 200-pole line in well under a second (regression for the old O(n^3) loop)", () => {
    const poles = linePoles(200);

    const official: InferredConnection[] = Array.from({ length: 40 }, (_, i) => ({
      parentPoleId: `P${i}`,
      childPoleId: `P${i + 1}`,
      distance: 0,
      confidence: 1,
    }));

    const start = Date.now();

    engine.complete(
      { id: "DT", latitude: 12.968, longitude: 77.594 },
      poles,
      official,
    );

    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
  });
});
