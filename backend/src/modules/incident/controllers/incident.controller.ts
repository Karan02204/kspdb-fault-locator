import type { Request, Response , NextFunction } from "express";

import { IncidentService } from "../services/incident.service.js";


interface IncidentParams {
  id: string;
}
export class IncidentController {
  private incidentService = new IncidentService();

  async processTransformer(req: Request, res: Response): Promise<void> {
    try {
      const { transformerId } = req.params;

      if (!transformerId || Array.isArray(transformerId)) {
        res.status(400).json({
          message: "Invalid transformer ID.",
        });
        return;
      }

      if (!transformerId) {
        res.status(400).json({
          message: "Transformer ID is required.",
        });

        return;
      }

      const incidents =
        await this.incidentService.processTransformer(transformerId);

      res.status(200).json({
        message: "Incident processing completed.",
        incidents,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to process incidents.",
      });
    }
  }

  getIncidents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.incidentService.getIncidents());
    } catch (error) {
      next(error);
    }
  };

  getActiveIncidents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      res.json(await this.incidentService.getActiveIncidents());
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.incidentService.getIncidentHistory());
    } catch (error) {
      next(error);
    }
  };

  getIncidentById = async (req: Request<IncidentParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await this.incidentService.getIncidentById(req.params.id));
    } catch (error) {
      next(error);
    }
  };
}
