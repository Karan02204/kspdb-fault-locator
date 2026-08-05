import { TicketStatus } from "../../../../generated/prisma/enums.js";

import { IncidentRepository } from "../repositories/incident.repository.js";

export class TicketService {
  private repository = new IncidentRepository();

  async getTickets() {
    return this.repository.getTickets();
  }

  async getActiveTickets() {
    return this.repository.getActiveTickets();
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.repository.getTicketById(ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    return ticket;
  }

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus) {
    const ticket = await this.repository.getTicketById(ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    this.validateTransition(ticket.status, newStatus);

    const now = new Date();

    const updateData: {
      status: TicketStatus;

      acknowledgedAt?: Date;

      crewAssignedAt?: Date;

      resolvedAt?: Date;

      verifiedAt?: Date;

      closedAt?: Date;
    } = {
      status: newStatus,
    };

    switch (newStatus) {
      case TicketStatus.ACKNOWLEDGED:
        updateData.acknowledgedAt = now;
        break;

      case TicketStatus.CREW_ASSIGNED:
        updateData.crewAssignedAt = now;
        break;

      case TicketStatus.RESOLVED:
        updateData.resolvedAt = now;
        break;

      case TicketStatus.VERIFIED:
        updateData.verifiedAt = now;
        break;

      case TicketStatus.CLOSED:
        updateData.closedAt = now;
        break;
    }

    return this.repository.updateTicketStatus(ticketId, updateData);
  }

  private validateTransition(current: TicketStatus, next: TicketStatus) {
    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      DETECTED: [TicketStatus.ACKNOWLEDGED],

      ACKNOWLEDGED: [TicketStatus.CREW_ASSIGNED],

      CREW_ASSIGNED: [TicketStatus.RESOLVED],

      RESOLVED: [TicketStatus.VERIFIED],

      VERIFIED: [TicketStatus.CLOSED],

      CLOSED: [],
    };

    const allowed = allowedTransitions[current];

    if (!allowed.includes(next)) {
      throw new Error(`Invalid ticket transition: ${current} -> ${next}`);
    }
  }
}