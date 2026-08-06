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
    boundaryFromPole: {
      pin: string | null;
      lat: number | null;
      lon: number | null;
    };

    boundaryToPole: {
      pin: string | null;
      lat: number | null;
      lon: number | null;
    };
    affectedPoles: string[];
    confidenceScore: number;
    confidenceBreakdown?: Array<{
      type: string;
      score: number;
      reason: string;
    }>;
  };
}