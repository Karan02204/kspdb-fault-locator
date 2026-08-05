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
    const energizedPoles = poleStates.filter(
      (pole) => pole.state === PoleState.LIVE,
    );

    if (energizedPoles.length === 0) {
      const downstream = new Set(connections.map((c) => c.toPoleId));

      const rootConnection = connections.find(
        (c) => !downstream.has(c.fromPoleId),
      )!;

      return [
        {
          transformerId,

          upstreamPoleId: rootConnection.fromPoleId,

          downstreamPoleId: rootConnection.toPoleId,

          affectedPoles: poleStates.map((pole) => pole.poleId),

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

      const connection = connectionMap.get(
        this.getConnectionKey(
          boundary.upstreamPoleId,
          boundary.downstreamPoleId,
        ),
      );

      if (!connection) {
        throw new Error(
          `Topology connection not found for boundary ${boundary.upstreamPoleId} -> ${boundary.downstreamPoleId}.`,
        );
      }

      localizedFaults.push({
        transformerId,

        upstreamPoleId: boundary.upstreamPoleId,

        downstreamPoleId: boundary.downstreamPoleId,

        affectedPoles: subtree.affectedPoles,

        topologySource: connection.source,
        
        topologyConfidence: connection.confidence,
      });
    }

    return localizedFaults;
  }
}