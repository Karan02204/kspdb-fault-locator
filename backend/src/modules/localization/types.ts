export interface LocalizedFault {
  transformerId: string;

  /** The last pole confirmed LIVE (upstream of the fault). */
  upstreamPoleId: string;

  /**
   * The first pole confirmed DARK downstream of the fault.
   *
   * For a clean boundary this is the direct child of `upstreamPoleId`.
   * When the span between them contains poles with no reliable telemetry
   * (no device, dead sensor, firmware 1.2 silence), this is the first pole
   * with positive darkness evidence and `unknownGapPoles` lists the poles
   * in between — the fault is on the *range* `upstreamPoleId → downstreamPoleId`.
   */
  downstreamPoleId: string;

  /**
   * Poles between the upstream (LIVE) pole and the first confirmed DARK pole
   * whose state is UNKNOWN. Empty for a clean single-span boundary.
   * When non-empty, the reported location is a range, not a point span.
   */
  unknownGapPoles?: string[];

  affectedPoles: string[];

  /**
   * What kind of asset is suspected:
   * - "SPAN" — a boundary between a live pole and the first dark pole.
   * - "RANGE" — the boundary passes through UNKNOWN poles; the fault is
   *   somewhere on the range, not pinned to a single span.
   * - "DT" — every pole with a known state under the transformer is dark.
   */
  faultKind?: "SPAN" | "RANGE" | "DT";

  topologySource: "OFFICIAL" | "INFERRED";

  topologyConfidence: number;
}

export interface FaultBoundary {
  upstreamPoleId: string;

  downstreamPoleId: string;

  /** Poles between upstream and downstream whose state is UNKNOWN. */
  unknownGapPoles?: string[];
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