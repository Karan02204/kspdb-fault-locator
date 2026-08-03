import type { Request, Response, NextFunction } from "express";
import { telemetrySchema } from "../validators/telemetry.schema.js";
import { TelemetryService } from "../services/telemetry.service.js";
import { TelemetryNormalizer } from "../normalizers/telemetry.normalizer.js";


export class TelemetryController {
  private telemetryService = new TelemetryService();
  private telemetryNormalizer = new TelemetryNormalizer();

  processTelemetry = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const payload = telemetrySchema.parse(req.body);

      const normalizedTelemetry = this.telemetryNormalizer.normalize(payload);

      const result = await this.telemetryService.processTelemetry(normalizedTelemetry);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
