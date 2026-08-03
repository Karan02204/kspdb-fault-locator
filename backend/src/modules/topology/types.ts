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

export interface TopologyInferenceResult {
  transformerId: string;

  edges: InferredConnection[];

  validation: TopologyValidationResult;
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
