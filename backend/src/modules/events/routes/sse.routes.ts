import { Router } from "express";

import { SSEController } from "../controllers/sse.controller.js";

const router = Router();

const controller = new SSEController();

router.get("/", controller.connect.bind(controller));

export default router;