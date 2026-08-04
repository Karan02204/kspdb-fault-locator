import type { Request, Response } from "express";

import { LocalizationService } from "../services/localization.service.js";

interface LocalizationParams {
  transformerId: string;
}

const service = new LocalizationService();

export async function localizeTransformer(
  req: Request<LocalizationParams>,
  res: Response,
) {

  const faults = await service.localizeTransformer(req.params.transformerId);

  res.json(faults);
}