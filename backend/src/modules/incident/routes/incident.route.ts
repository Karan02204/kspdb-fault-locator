import { Router } from "express";

import { IncidentController } from "../controllers/incident.controller.js";

const router = Router();

const controller = new IncidentController();


router.get("/", controller.getIncidents);

router.get("/active", controller.getActiveIncidents);

router.get("/history", controller.getHistory);

router.get("/:id", controller.getIncidentById);


export default router;