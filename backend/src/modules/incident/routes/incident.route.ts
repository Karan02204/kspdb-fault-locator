import { Router } from "express";

import { IncidentController } from "../controllers/incident.controller.js";

const router = Router();

const controller = new IncidentController();

router.post(
  "/transformers/:transformerId/process",
  controller.processTransformer.bind(controller),
);

export default router;