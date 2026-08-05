import type { ConfidenceFactor, ConfidenceResult } from "../confidence/type";
import type { LocalizedFault } from "../localization/types";

export interface Incident {
  id: string;

  transformerId: string;

  boundaryFromPoleId: string;

  boundaryToPoleId: string;

  affectedPoles: string[];

  confidenceScore: number;

  confidenceBreakdown: ConfidenceFactor[];

  isTicketCreated: boolean;

  detectedAt: Date;

  lastLocalizedAt: Date;

  updatedAt: Date;
}

export interface IncidentCandidate {
  fault: LocalizedFault;

  confidence: ConfidenceResult;
}

export interface GroupingResult {
  existingIncident?: Incident;

  isNewIncident: boolean;
}
