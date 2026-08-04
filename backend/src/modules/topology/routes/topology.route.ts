import { Router } from "express";
import { inferMissingTopology } from "../controllers/topology.controller.js";

const router = Router();

router.post("/infer", inferMissingTopology);

export default router;
