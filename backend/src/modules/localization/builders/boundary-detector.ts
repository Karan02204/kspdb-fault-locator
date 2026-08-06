import type {
  FaultBoundary,
  PoleStatus,
  TopologyConnection,
} from "../types.js";

import { PoleState } from "../types.js";

/**
 * Finds every LIVE→DARK frontier in a radial distribution tree.
 *
 * A fault's observable signature is the boundary between the live region
 * and the dark region. Because sensors report on nodes and we infer the
 * state of spans (edges), we look for:
 *
 * 1. Exact boundaries: a LIVE pole whose direct child is DARK.
 * 2. Range boundaries: a LIVE pole followed by one or more UNKNOWN poles
 *    (no device, dead sensor, firmware 1.2 silence) followed by the first
 *    pole with positive darkness evidence. The fault is reported as the
 *    range between the LIVE pole and that first confirmed-DARK pole so the
 *    outage is never missed just because a pole on the boundary cannot talk.
 *
 * If the chain past an UNKNOWN pole reaches a LIVE pole before any DARK
 * pole, no boundary is emitted — a dark or silent section with live power
 * downstream of it is physically impossible as a line fault and is treated
 * as a sensor failure, not an outage (see `01-problem-context.md` §2).
 */
export class BoundaryDetector {
  detect(
    connections: TopologyConnection[],
    poleStates: PoleStatus[],
  ): FaultBoundary[] {
    const stateMap = new Map<string, PoleStatus>();

    for (const pole of poleStates) {
      stateMap.set(pole.poleId, pole);
    }

    const childrenOf = new Map<string, string[]>();

    for (const connection of connections) {
      if (!childrenOf.has(connection.fromPoleId)) {
        childrenOf.set(connection.fromPoleId, []);
      }

      childrenOf.get(connection.fromPoleId)!.push(connection.toPoleId);
    }

    const boundaries: FaultBoundary[] = [];

    // Dedupe: one boundary per (upstream, first-dark) pair, even when the
    // boundary is reachable through more than one connection.
    const emitted = new Set<string>();

    for (const connection of connections) {
      const parent = stateMap.get(connection.fromPoleId);

      const child = stateMap.get(connection.toPoleId);

      if (!parent || !child) {
        continue;
      }

      if (parent.state === PoleState.LIVE && child.state === PoleState.DARK) {
        this.addBoundary(
          boundaries,
          emitted,
          parent.poleId,
          child.poleId,
          [],
        );
        continue;
      }

      if (parent.state === PoleState.LIVE && child.state === PoleState.UNKNOWN) {
        const range = this.traceUnknownRange(
          connection.toPoleId,
          childrenOf,
          stateMap,
        );

        if (range && range.firstDarkPoleId) {
          this.addBoundary(
            boundaries,
            emitted,
            parent.poleId,
            range.firstDarkPoleId,
            range.unknownGapPoles,
          );
        }
        // range === "LIVE" or "END": no darkness evidence -> not a fault.
      }
    }

    return boundaries;
  }

  private addBoundary(
    boundaries: FaultBoundary[],
    emitted: Set<string>,
    upstreamPoleId: string,
    downstreamPoleId: string,
    unknownGapPoles: string[],
  ): void {
    const key = `${upstreamPoleId}->${downstreamPoleId}`;

    if (emitted.has(key)) {
      return;
    }

    emitted.add(key);

    boundaries.push({
      upstreamPoleId,
      downstreamPoleId,
      unknownGapPoles,
    });
  }

  /**
   * Walk downstream from a pole whose state is UNKNOWN until we find
   * positive evidence of darkness or liveness.
   *
   * Returns `null` when no DARK pole is reachable (nothing to report),
   * otherwise the first confirmed-DARK pole and the UNKNOWN poles between
   * the boundary start and that pole.
   */
  private traceUnknownRange(
    startPoleId: string,
    childrenOf: Map<string, string[]>,
    stateMap: Map<string, PoleStatus>,
  ): { firstDarkPoleId: string; unknownGapPoles: string[] } | null {
    // BFS through the UNKNOWN section (it may fork). Track parents so we can
    // reconstruct the shortest UNKNOWN path to the first confirmed-DARK pole.
    const parent = new Map<string, string>();

    const visited = new Set<string>([startPoleId]);

    const queue: string[] = [startPoleId];

    while (queue.length > 0) {
      const cursor = queue.shift()!;

      const kids = childrenOf.get(cursor) ?? [];

      const darkKid = kids.find(
        (kid) => stateMap.get(kid)?.state === PoleState.DARK,
      );

      if (darkKid) {
        // Reconstruct the UNKNOWN path from the start to this pole.
        const unknownGapPoles: string[] = [];

        let node: string | undefined = cursor;

        while (node !== undefined) {
          unknownGapPoles.unshift(node);

          node = parent.get(node);
        }

        return {
          firstDarkPoleId: darkKid,
          unknownGapPoles,
        };
      }

      const liveKid = kids.find(
        (kid) => stateMap.get(kid)?.state === PoleState.LIVE,
      );

      if (liveKid && kids.every((kid) => stateMap.get(kid)?.state !== PoleState.UNKNOWN)) {
        // Power flows again past the silent section -> the silence is a
        // sensor problem, not a fault. Do not report a boundary.
        return null;
      }

      for (const kid of kids) {
        if (stateMap.get(kid)?.state === PoleState.UNKNOWN && !visited.has(kid)) {
          visited.add(kid);

          parent.set(kid, cursor);

          queue.push(kid);
        }
      }
    }

    // Reached the end of the line with no darkness evidence.
    return null;
  }
}
