import { Router } from "express";
import { SimulatorController } from "../controllers/simulator.controller.js";

const router = Router();

const controller = new SimulatorController();

router.post("/boot", controller.boot.bind(controller));
router.post("/heartbeat", controller.heartbeat.bind(controller));
router.post("/power-lost", controller.powerLost.bind(controller));
router.post("/power-restored", controller.powerRestored.bind(controller));

router.post("/span-fault", controller.spanFault.bind(controller));

router.post("/transformer-fault", controller.transformerFault.bind(controller));

router.post("/feeder-fault", controller.feederFault.bind(controller));

router.post("/repair", controller.repair.bind(controller));

router.post("/device-failure", controller.deadDevice.bind(controller));

router.post("/maintenance", controller.scheduleMaintenance.bind(controller));

export default router;
