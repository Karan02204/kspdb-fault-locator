export interface Ticket {
  id: string;
  ticketNumber: string;

  status:
    | "DETECTED"
    | "ACKNOWLEDGED"
    | "CREW_ASSIGNED"
    | "RESOLVED"
    | "VERIFIED"
    | "CLOSED";

  detectedAt: string;
  acknowledgedAt: string | null;
  crewAssignedAt: string | null;
  resolvedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;

  incident: {
    id: string;
    incidentNumber: string;
    transformerId: string;
    boundaryFromPoleId: string;
    boundaryToPoleId: string;
    affectedPoles: string[];
    confidenceScore: number;
  };
}