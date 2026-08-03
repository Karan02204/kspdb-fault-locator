import type { Request, Response } from "express";
import { NetworkService } from "../services/network.service.js";

const networkService = new NetworkService();

export class NetworkController {
  async importNetwork(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || Array.isArray(req.files)) {
        res.status(400).json({ error: "Files are missing or incorrectly formatted. Provide 'poles' and 'transformers' files." });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const polesFile = files["poles"]?.[0];
      const transformersFile = files["transformers"]?.[0];

      if (!polesFile || !transformersFile) {
        res.status(400).json({ error: "Both 'poles' and 'transformers' CSV files are required." });
        return;
      }

      const summary = await networkService.importNetwork(polesFile.buffer, transformersFile.buffer);

      res.status(200).json({
        message: "Network imported successfully",
        summary,
      });
    } catch (error: any) {
      console.error("Import Network Error:", error);
      res.status(400).json({ error: error.message || "Failed to import network" });
    }
  }

  async getNetwork(req: Request, res: Response): Promise<void> {
    try {
      const data = await networkService.getNetwork();
      res.status(200).json(data);
    } catch (error: any) {
      console.error("Get Network Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getNetworkStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await networkService.getNetworkStats();
      res.status(200).json(stats);
    } catch (error: any) {
      console.error("Get Network Stats Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
