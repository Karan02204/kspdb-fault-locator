import { Router } from "express";

import { localizeTransformer } from "../controllers/localization.controller.js";

const router = Router();

router.post("/:transformerId", localizeTransformer);

export default router;