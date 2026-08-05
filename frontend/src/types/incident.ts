export interface Incident {
  id: string;

  incidentNumber: string;

  transformerId: string;

  boundaryFromPoleId: string;

  boundaryToPoleId: string;

  affectedPoles: string[];

  confidenceScore: number;

  isTicketCreated: boolean;

  detectedAt: string;

  lastLocalizedAt: string;
}