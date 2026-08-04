export interface GraphNode {
  id: string;

  latitude: number;

  longitude: number;
}

export interface GraphEdge {
  from: string;

  to: string;

  distance: number;
}

export interface CandidateGraph {
  nodes: GraphNode[];

  edges: GraphEdge[];
}

export interface MSTEdge {
  from: string;

  to: string;

  distance: number;
}

export interface InferredConnection {
  parentPoleId: string;
  childPoleId: string;
  distance: number;
}

export interface TopologyValidationResult {
  valid: boolean;

  confidence: number;

  warnings: string[];
}

export interface GraphBuilderOptions {
  /**
   * Maximum distance (in metres) between two poles
   * to be considered candidate neighbours.
   */
  maxNeighbourDistance: number;

  /**
   * Number of nearest neighbours each pole
   * may connect to.
   */
  maxNeighbours: number;
}

export interface TopologyInferenceResult {
  transformerId: string;

  inferredConnections: InferredConnection[];

  validation: TopologyValidationResult;
}

export interface TransformerLocation {
  id: string;
  latitude: number;
  longitude: number;
}

export interface PoleAttachment {
  parent: GraphNode;

  child: GraphNode;

  distance: number;
}

export enum TopologyState {
  COMPLETE = "COMPLETE",
  PARTIAL = "PARTIAL",
  MISSING = "MISSING",
}