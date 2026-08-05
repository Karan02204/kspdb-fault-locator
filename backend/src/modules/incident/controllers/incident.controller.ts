import type { Request, Response } from "express";

import { IncidentService } from "../services/incident.service.js";

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
}
