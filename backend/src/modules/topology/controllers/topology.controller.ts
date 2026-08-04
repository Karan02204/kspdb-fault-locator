import type { Request, Response } from "express";
import { TopologyService } from "../services/topology.service.js";

const topologyService = new TopologyService();

export async function inferMissingTopology(req: Request, res: Response) {
  await topologyService.inferMissingTopology();

  return res.status(200).json({
    success: true,
    message: "Missing topology inferred successfully.",
  });
}