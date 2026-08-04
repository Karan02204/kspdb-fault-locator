export interface LocalizedFault {
  transformerId: string;

  upstreamPoleId: string;

  downstreamPoleId: string;

  affectedPoles: string[];

  topologySource: "OFFICIAL" | "INFERRED";

  topologyConfidence: number;
}

export interface FaultBoundary {
  upstreamPoleId: string;

  downstreamPoleId: string;
}

export interface TopologyConnection {
  fromPoleId: string;

  toPoleId: string;

  source: "OFFICIAL" | "INFERRED";

  confidence: number;
}

export enum PoleState {
  LIVE = "LIVE",

  DARK = "DARK",

  UNKNOWN = "UNKNOWN",
}

export interface PoleStatus {
  poleId: string;

  state: PoleState;
}

export interface AffectedSubtree {
  rootPoleId: string;

  affectedPoles: string[];
}