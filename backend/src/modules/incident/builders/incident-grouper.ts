import type { GroupingResult, Incident, IncidentCandidate } from "../types.js";

export class IncidentGrouper {
  private static readonly GROUPING_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  private static readonly SUBTREE_OVERLAP_THRESHOLD = 0.7;

  findMatchingIncident(
    candidate: IncidentCandidate,
    existingIncidents: Incident[],
  ): GroupingResult {
    const now = new Date();

    for (const incident of existingIncidents) {
      // ------------------------------------------------------------------
      // Rule 1: Must belong to the same transformer
      // ------------------------------------------------------------------
      if (incident.transformerId !== candidate.fault.transformerId) {
        continue;
      }

      // ------------------------------------------------------------------
      // Rule 2: Must be within the grouping time window
      // ------------------------------------------------------------------
      const age = now.getTime() - incident.lastLocalizedAt.getTime();

      if (age > IncidentGrouper.GROUPING_WINDOW_MS) {
        continue;
      }

      // ------------------------------------------------------------------
      // Rule 3: Exact boundary match
      // ------------------------------------------------------------------
      if (
        incident.boundaryFromPoleId === candidate.fault.upstreamPoleId &&
        incident.boundaryToPoleId === candidate.fault.downstreamPoleId
      ) {
        return {
          existingIncident: incident,
          isNewIncident: false,
        };
      }

      // ------------------------------------------------------------------
      // Rule 4: Subtree overlap
      // ------------------------------------------------------------------
      const overlap = this.calculateSubtreeOverlap(
        incident.affectedPoles,
        candidate.fault.affectedPoles,
      );

      if (overlap >= IncidentGrouper.SUBTREE_OVERLAP_THRESHOLD) {
        return {
          existingIncident: incident,
          isNewIncident: false,
        };
      }
    }

    return {
      isNewIncident: true,
    };
  }

  private calculateSubtreeOverlap(
    existingPoles: string[],
    candidatePoles: string[],
  ): number {
    const existing = new Set(existingPoles);

    let common = 0;

    for (const poleId of candidatePoles) {
      if (existing.has(poleId)) {
        common++;
      }
    }

    const smallerSubtree = Math.min(
      existingPoles.length,
      candidatePoles.length,
    );

    if (smallerSubtree === 0) {
      return 0;
    }

    return common / smallerSubtree;
  }
}
