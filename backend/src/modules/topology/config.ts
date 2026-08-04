/**
 * Topology inference configuration.
 *
 * These values represent engineering assumptions used while
 * constructing the candidate graph for MST inference.
 */
export const TOPOLOGY_CONFIG = {
  /**
   * Maximum distance (in metres) between two poles for them
   * to be considered candidate neighbours.
   */
  MAX_NEIGHBOUR_DISTANCE: 120,

  /**
   * Maximum number of nearest neighbours considered
   * for each pole.
   */
  MAX_NEIGHBOURS: 3,
} as const;
