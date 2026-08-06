import { TicketStatus } from "../../../../generated/prisma/enums.js";
import { eventBus } from "../../events/builders/event-bus.js";

import { IncidentRepository } from "../repositories/incident.repository.js";
import { LocalizationService } from "../../localization/services/localization.service.js";
import { PoleState } from "../../localization/types.js";

export class TicketService {
  private repository = new IncidentRepository();

  private localizationService = new LocalizationService();

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
        // ------------------------------------------------------------------
        // Restoration must be verified from telemetry, not from a click.
        // The lineman may claim "fixed" while the span is still dark — the
        // system pushes back. The check is scoped to THIS incident's span,
        // so repairing one of several simultaneous faults does not block
        // resolving the ticket for the span that IS live again.
        // ------------------------------------------------------------------
        await this.assertSpanRestored(ticket.incident);

        updateData.resolvedAt = now;
        break;

      case TicketStatus.VERIFIED:
        updateData.verifiedAt = now;
        break;

      case TicketStatus.CLOSED:
        updateData.closedAt = now;
        break;
    }

    const updatedTicket = await this.repository.updateTicketStatus(
      ticketId,
      updateData,
    );

    if (newStatus === TicketStatus.CLOSED) {
      const incident = await this.repository.getIncidentById(
        updatedTicket.incidentId,
      );
      await this.repository.deleteIncidentByTicket(ticketId);

      eventBus.publish("incident.updated", incident);
    }

    eventBus.publish("ticket.updated", updatedTicket);

    return updatedTicket;
  }

  /**
   * System-side restoration verification: advance a ticket to VERIFIED
   * because telemetry says power is flowing again — no human click involved.
   */
  async verifyFromTelemetry(ticketId: string) {
    const ticket = await this.repository.getTicketById(ticketId);

    if (!ticket) {
      return;
    }

    if (
      ticket.status === TicketStatus.VERIFIED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      return;
    }

    const now = new Date();

    if (ticket.status !== TicketStatus.RESOLVED) {
      await this.repository.updateTicketStatus(ticketId, {
        status: TicketStatus.RESOLVED,

        resolvedAt: now,
      });
    }

    const updatedTicket = await this.repository.updateTicketStatus(ticketId, {
      status: TicketStatus.VERIFIED,

      verifiedAt: now,
    });

    eventBus.publish("ticket.updated", updatedTicket);
  }

  private async assertSpanRestored(incident: {
    transformerId: string;

    boundaryToPoleId: string;
  }) {
    const poleStates = await this.localizationService.getPoleStatesByIds([
      incident.boundaryToPoleId,
    ]);

    const boundaryPole = poleStates[0];

    if (boundaryPole && boundaryPole.state === PoleState.DARK) {
      throw new Error("Power has not been restored. Fault still detected.");
    }
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

    if (!allowed?.includes(next)) {
      throw new Error(`Invalid ticket transition: ${current} -> ${next}`);
    }
  }
}
