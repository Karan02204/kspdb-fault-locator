import type { Request, Response, NextFunction } from "express";

import { TicketService } from "../services/ticket.service.js";
import { updateTicketSchema } from "../validators/update-ticket.schema.js";

interface TicketParams {
  id: string;
}

export class TicketController {
  private ticketService = new TicketService();

  getTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tickets = await this.ticketService.getTickets();

      return res.status(200).json(tickets);
    } catch (error) {
      next(error);
    }
  };

  getActiveTickets = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tickets = await this.ticketService.getActiveTickets();

      return res.status(200).json(tickets);
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: Request<TicketParams>, res: Response, next: NextFunction) => {
    try {
      const ticket = await this.ticketService.getTicketById(req.params.id);

      return res.status(200).json(ticket);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request<TicketParams>, res: Response, next: NextFunction) => {
    try {
      const body = updateTicketSchema.parse(req.body);

      const ticket = await this.ticketService.updateTicketStatus(
        req.params.id,
        body.status,
      );

      return res.status(200).json(ticket);
    } catch (error) {
      next(error);
    }
  };
}