import { PrismaClient , Prisma} from "../../../../generated/prisma/client";

import { TicketStatus } from "../../../../generated/prisma/enums";
import type { ConfidenceFactor } from "../../confidence/type";

import type { Incident, IncidentCandidate } from "../types.js";

const prisma = new PrismaClient();

export class IncidentRepository {
  private async generateIncidentNumber(): Promise<string> {
    const count = await prisma.incident.count();

    return `INC-${String(count + 1).padStart(6, "0")}`;
  }

  async findOpenIncidents(transformerId: string): Promise<Incident[]> {
    const incidents = await prisma.incident.findMany({
      where: {
        transformerId,

        OR: [
          {
            ticket: null,
          },
          {
            ticket: {
              status: {
                notIn: [TicketStatus.VERIFIED, TicketStatus.CLOSED],
              },
            },
          },
        ],
      },
    });

    return incidents.map((incident) => ({
      id: incident.id,

      transformerId: incident.transformerId,

      boundaryFromPoleId: incident.boundaryFromPoleId,

      boundaryToPoleId: incident.boundaryToPoleId,

      affectedPoles: incident.affectedPoles as string[],

      confidenceScore: incident.confidenceScore,

      confidenceBreakdown:
        incident.confidenceBreakdown as unknown as ConfidenceFactor[],

      isTicketCreated: incident.isTicketCreated,

      detectedAt: incident.detectedAt,

      lastLocalizedAt: incident.lastLocalizedAt,

      updatedAt: incident.updatedAt,
    }));
  }

  async createIncident(candidate: IncidentCandidate): Promise<Incident> {
    const incidentNumber = await this.generateIncidentNumber();

    const incident = await prisma.incident.create({
      data: {
        incidentNumber,

        transformerId: candidate.fault.transformerId,

        boundaryFromPoleId: candidate.fault.upstreamPoleId,

        boundaryToPoleId: candidate.fault.downstreamPoleId,

        affectedPoles: candidate.fault.affectedPoles,

        confidenceScore: candidate.confidence.overallScore,

        confidenceBreakdown: candidate.confidence
          .factors as unknown as Prisma.InputJsonValue,

        lastLocalizedAt: new Date(),
      },
    });

    return {
      id: incident.id,

      transformerId: incident.transformerId,

      boundaryFromPoleId: incident.boundaryFromPoleId,

      boundaryToPoleId: incident.boundaryToPoleId,

      affectedPoles: incident.affectedPoles as string[],

      confidenceScore: incident.confidenceScore,

      confidenceBreakdown:
        incident.confidenceBreakdown as unknown as ConfidenceFactor[],

      isTicketCreated: incident.isTicketCreated,

      detectedAt: incident.detectedAt,

      lastLocalizedAt: incident.lastLocalizedAt,

      updatedAt: incident.updatedAt,
    };
  }

  async createIncidentWithTicket(
    candidate: IncidentCandidate,
  ): Promise<Incident> {
    const incident = await this.createIncident(candidate);

    await this.createTicket(incident.id);

    return incident;
  }

  async updateIncident(
    incidentId: string,
    candidate: IncidentCandidate,
  ): Promise<Incident> {
    const incident = await prisma.incident.update({
      where: {
        id: incidentId,
      },

      data: {
        confidenceScore: candidate.confidence.overallScore,

        confidenceBreakdown: candidate.confidence
          .factors as unknown as Prisma.InputJsonValue,

        affectedPoles: candidate.fault.affectedPoles,

        lastLocalizedAt: new Date(),
      },
    });

    return {
      id: incident.id,

      transformerId: incident.transformerId,

      boundaryFromPoleId: incident.boundaryFromPoleId,

      boundaryToPoleId: incident.boundaryToPoleId,

      affectedPoles: incident.affectedPoles as string[],

      confidenceScore: incident.confidenceScore,

      confidenceBreakdown:
        incident.confidenceBreakdown as unknown as ConfidenceFactor[],

      isTicketCreated: incident.isTicketCreated,

      detectedAt: incident.detectedAt,

      lastLocalizedAt: incident.lastLocalizedAt,

      updatedAt: incident.updatedAt,
    };
  }

  async getIncidents() {
    return prisma.incident.findMany({
      include: {
        ticket: true,
        transformer: true,
      },

      orderBy: {
        detectedAt: "desc",
      },
    });
  }

  async getIncidentById(incidentId: string) {
    return prisma.incident.findUnique({
      where: {
        id: incidentId,
      },

      include: {
        ticket: true,
        transformer: true,
      },
    });
  }

  async getActiveIncidents() {
    return prisma.incident.findMany({
      where: {
        OR: [
          {
            ticket: null,
          },
          {
            ticket: {
              status: {
                notIn: [TicketStatus.VERIFIED, TicketStatus.CLOSED],
              },
            },
          },
        ],
      },

      include: {
        ticket: true,
        transformer: true,
      },

      orderBy: {
        detectedAt: "desc",
      },
    });
  }

  async getIncidentHistory() {
    return prisma.incident.findMany({
      include: {
        ticket: true,
        transformer: true,
      },

      orderBy: {
        detectedAt: "desc",
      },
    });
  }

  async createTicket(incidentId: string): Promise<void> {
    const count = await prisma.ticket.count();

    const ticketNumber = `TKT-${String(count + 1).padStart(6, "0")}`;

    await prisma.ticket.create({
      data: {
        ticketNumber,

        incidentId,
      },
    });

    await prisma.incident.update({
      where: {
        id: incidentId,
      },

      data: {
        isTicketCreated: true,
      },
    });
  }

  async getTickets() {
    return prisma.ticket.findMany({
      include: {
        incident: true,
      },

      orderBy: {
        detectedAt: "desc",
      },
    });
  }

  async getTicketById(ticketId: string) {
    return prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },

      include: {
        incident: true,
      },
    });
  }

  async updateTicketStatus(
    ticketId: string,
    data: {
      status: TicketStatus;

      acknowledgedAt?: Date;

      crewAssignedAt?: Date;

      resolvedAt?: Date;

      verifiedAt?: Date;

      closedAt?: Date;
    },
  ) {
    return prisma.ticket.update({
      where: {
        id: ticketId,
      },

      data,
    });
  }

  async getActiveTickets() {
    return prisma.ticket.findMany({
      where: {
        status: {
          notIn: [TicketStatus.VERIFIED, TicketStatus.CLOSED],
        },
      },

      include: {
        incident: true,
      },

      orderBy: {
        detectedAt: "desc",
      },
    });
  }
}
