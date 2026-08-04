import type {
  FaultBoundary,
  PoleStatus,
  TopologyConnection,
} from "../types.js";

import { PoleState } from "../types.js";

export class BoundaryDetector {
  detect(
    connections: TopologyConnection[],
    poleStates: PoleStatus[],
  ): FaultBoundary[] {
    const stateMap = new Map<string, PoleStatus>();

    for (const pole of poleStates) {
      stateMap.set(pole.poleId, pole);
    }

    const boundaries: FaultBoundary[] = [];

    for (const connection of connections) {
        const parent = stateMap.get(connection.fromPoleId);

        const child = stateMap.get(connection.toPoleId);

        if (!parent || !child) {
          continue;
        }

        const isBoundary =
          parent.state === PoleState.LIVE && child.state === PoleState.DARK;

        if (!isBoundary) {
          continue;
        }

        boundaries.push({
          upstreamPoleId: parent.poleId,
          downstreamPoleId: child.poleId,
        });
    }

    return boundaries;
  }
}
