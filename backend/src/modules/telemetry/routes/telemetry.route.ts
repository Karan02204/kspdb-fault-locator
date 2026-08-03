import { Router } from "express";
import { TelemetryController } from "../controllers/telemetry.controller.js";

const router = Router();

const controller = new TelemetryController();

router.post("/", controller.processTelemetry);

export default router;
