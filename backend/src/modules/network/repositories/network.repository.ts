import { prisma } from "../../../lib/prisma.js";
import type { NetworkImportData } from "../types.js";

export class NetworkRepository {
  async importNetwork(data: NetworkImportData) {
    return prisma.$transaction(async (tx) => {
      // 1. Delete previous network in reverse dependency order to avoid foreign key violations
      await tx.poleConnection.deleteMany();
      await tx.telemetryEvent.deleteMany();
      await tx.poleHealth.deleteMany();
      await tx.device.deleteMany();
      await tx.ticket.deleteMany();
      await tx.incident.deleteMany();
      await tx.pole.deleteMany();
      await tx.maintenanceEvent.deleteMany();
      await tx.distributionTransformer.deleteMany();
      await tx.feeder.deleteMany();

      // 2. Insert new network
      if (data.feeders.length > 0) {
        await tx.feeder.createMany({
          data: data.feeders,
        });
      }

      if (data.transformers.length > 0) {
        await tx.distributionTransformer.createMany({
          data: data.transformers,
        });
      }

      if (data.poles.length > 0) {
        await tx.pole.createMany({
          data: data.poles,
        });
      }

      if (data.devices.length > 0) {
        await tx.device.createMany({
          data: data.devices,
        });
      }

      if (data.connections.length > 0) {
        await tx.poleConnection.createMany({
          data: data.connections,
        });
      }

      return {
        feeders: data.feeders.length,
        transformers: data.transformers.length,
        poles: data.poles.length,
        devices: data.devices.length,
        connections: data.connections.length,
      };
    });
  }
}