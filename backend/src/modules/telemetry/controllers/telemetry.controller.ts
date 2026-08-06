import type { Request, Response, NextFunction } from "express";
import { telemetrySchema } from "../validators/telemetry.schema.js";
import { TelemetryService } from "../services/telemetry.service.js";
import { TelemetryNormalizer } from "../normalizers/telemetry.normalizer.js";
import { TelemetryBuffer } from "../builders/telemetry-buffer.js";


export class TelemetryController {
  private telemetryService = new TelemetryService();
  private telemetryNormalizer = new TelemetryNormalizer();
  private buffer = new TelemetryBuffer();

  processTelemetry = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const payload = telemetrySchema.parse(req.body);

      const normalizedTelemetry = this.telemetryNormalizer.normalize(payload);

      const result = await this.buffer.enqueue(
        normalizedTelemetry,
        async (packet) => {
          return this.telemetryService.processTelemetry(packet);
        },
      );

      return res.status(200).json(
        result ?? {
          ignored: true,
          reason: "Telemetry buffer overflow; packet dropped.",
        },
      );
    } catch (error) {
      next(error);
    }
  };
}
