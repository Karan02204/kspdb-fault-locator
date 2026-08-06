import { BoundaryDetector } from "./boundary-detector.js";
import { SubtreeBuilder } from "./subtree-builder.js";

import {
  PoleState,
  type LocalizedFault,
  type PoleStatus,
  type TopologyConnection,
} from "../types.js";

export class LocalizationEngine {
  private boundaryDetector = new BoundaryDetector();

  private subtreeBuilder = new SubtreeBuilder();

  private getConnectionKey(fromPoleId: string, toPoleId: string): string {
    return `${fromPoleId}->${toPoleId}`;
  }

  localize(
    transformerId: string,
    connections: TopologyConnection[],
    poleStates: PoleStatus[],
  ): LocalizedFault[] {
    const stateMap = new Map(poleStates.map((pole) => [pole.poleId, pole]));

    const knownPoles = poleStates.filter(
      (pole) => pole.state !== PoleState.UNKNOWN,
    );

    const darkPoles = knownPoles.filter((pole) => pole.state === PoleState.DARK);

    // ------------------------------------------------------------------
    // No evidence at all: a freshly imported or unreporting transformer
    // is NOT an outage. Never invent darkness where nothing was observed.
    // ------------------------------------------------------------------
    if (knownPoles.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------
    // Every pole with a known state is DARK -> a whole-DT outage (the
    // transformer's HT fuse / the DT itself). Requires at least two
    // independent darkness reports so a single dark sensor among a sea of
    // UNKNOWN poles does not escalate into a transformer-wide incident.
    // ------------------------------------------------------------------
    if (darkPoles.length === knownPoles.length && darkPoles.length >= 2) {
      const downstream = new Set(connections.map((c) => c.toPoleId));

      const rootConnection = connections.find(
        (c) => !downstream.has(c.fromPoleId),
      );

      if (!rootConnection) {
        return [];
      }

      return [
        {
          transformerId,

          upstreamPoleId: rootConnection.fromPoleId,

          downstreamPoleId: rootConnection.toPoleId,

          affectedPoles: poleStates.map((pole) => pole.poleId),

          faultKind: "DT",

          topologySource: rootConnection.source,

          topologyConfidence: rootConnection.confidence,
        },
      ];
    }

    const boundaries = this.boundaryDetector.detect(connections, poleStates);

    const connectionMap = new Map(
      connections.map((connection) => [
        this.getConnectionKey(connection.fromPoleId, connection.toPoleId),
        connection,
      ]),
    );

    const localizedFaults: LocalizedFault[] = [];

    for (const boundary of boundaries) {
      const subtree = this.subtreeBuilder.build(boundary, connections);

      // ------------------------------------------------------------------
      // Impossible-pattern check: a DARK pole whose own subtree contains a
      // LIVE pole is physically impossible as a line fault (power cannot
      // skip past the break). The assignment reads this signature as a
      // lying sensor, not an outage — suppress the boundary entirely.
      // ------------------------------------------------------------------
      const subtreeHasLive = subtree.affectedPoles.some(
        (poleId) => stateMap.get(poleId)?.state === PoleState.LIVE,
      );

      if (subtreeHasLive) {
        continue;
      }

      const gap = boundary.unknownGapPoles ?? [];

      // For a range boundary (UNKNOWN poles between the live pole and the
      // first confirmed-DARK pole) there is no direct connection; use the
      // edge from the LIVE pole to the first pole of the gap for topology
      // provenance and confidence.
      const spanFromPoleId = gap.length > 0 ? gap[0]! : boundary.downstreamPoleId;

      const connection = connectionMap.get(
        this.getConnectionKey(boundary.upstreamPoleId, spanFromPoleId),
      );

      if (!connection) {
        continue;
      }

      localizedFaults.push({
        transformerId,

        upstreamPoleId: boundary.upstreamPoleId,

        downstreamPoleId: boundary.downstreamPoleId,

        ...(gap.length > 0 ? { unknownGapPoles: gap } : {}),

        affectedPoles: [...gap, ...subtree.affectedPoles],

        faultKind: gap.length > 0 ? "RANGE" : "SPAN",

        topologySource: connection.source,

        topologyConfidence: connection.confidence,
      });
    }

    return localizedFaults;
  }
}
