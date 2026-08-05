import type { Request, Response } from "express";
import { SimulatorService } from "../services/simulator.service.js";

export class SimulatorController {
  private simulatorService = new SimulatorService();

  async boot(req: Request, res: Response) {
    const { deviceId } = req.body;

    const result = await this.simulatorService.boot(deviceId);

    res.json(result);
  }

  async heartbeat(req: Request, res: Response) {
    const { deviceId } = req.body;

    const result = await this.simulatorService.heartbeat(deviceId);

    res.json(result);
  }

  async powerLost(req: Request, res: Response) {
    const { deviceId } = req.body;

    const result = await this.simulatorService.powerLost(deviceId);

    res.json(result);
  }

  async powerRestored(req: Request, res: Response) {
    const { deviceId } = req.body;

    const result = await this.simulatorService.powerRestored(deviceId);

    res.json(result);
  }

  async spanFault(req: Request, res: Response) {
    const { upstreamDeviceId, downstreamDeviceId } = req.body;

    const result = await this.simulatorService.spanFault(
      upstreamDeviceId,
      downstreamDeviceId,
    );

    res.json(result);
  }

  async transformerFault(req: Request, res: Response) {
    const { deviceIds } = req.body;

    const result = await this.simulatorService.transformerFault(deviceIds);

    res.json(result);
  }

  async repair(req: Request, res: Response) {
    const { deviceIds } = req.body;

    const result = await this.simulatorService.repair(deviceIds);

    res.json(result);
  }
}