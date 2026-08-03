import { prisma } from "../../../lib/prisma";

export class TelemetryRepository {
  async findDevice(deviceId: string) {
    return prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        pole: true,
      },
    });
  }

  async getPoleHealth(poleId: string) {
    return prisma.poleHealth.findUnique({
      where: { poleId },
    });
  }

  async saveTelemetry(event: any, snapshot: any) {
    return prisma.$transaction(async (tx) => {
      await tx.telemetryEvent.create({
        data: event,
      });

      await tx.poleHealth.upsert({
        where: {
          poleId: snapshot.poleId,
        },
        update: snapshot,
        create: snapshot,
      });
    });
  }
}
