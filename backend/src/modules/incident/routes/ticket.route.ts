import { Router } from "express";

import { TicketController } from "../controllers/ticket.controller.js";

const router = Router();

const controller = new TicketController();

router.get("/", controller.getTickets);

router.get("/active", controller.getActiveTickets);

router.get("/:id", controller.getTicketById);

router.patch("/:id/status", controller.updateStatus);

export default router;