import { Router } from "express";
import { NetworkController } from "../controllers/network.controller.js";
import { upload } from "../middleware/upload.middleware.js";
console.log("🚀 network.routes.ts loaded");
const router = Router();
const networkController = new NetworkController();

router.get("/ping", (_, res) => {
  res.json({ message: "Network router is working!" });
});

router.post(
  "/import",
  upload.fields([
    { name: "poles", maxCount: 1 },
    { name: "transformers", maxCount: 1 },
  ]),
  networkController.importNetwork
);

router.get("/", networkController.getNetwork);
router.get("/stats", networkController.getNetworkStats);

export default router;
