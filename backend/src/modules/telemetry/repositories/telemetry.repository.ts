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

  async getTransformerIdByPoleId(poleId: string): Promise<string> {
    const pole = await prisma.pole.findUnique({
      where: {
        id: poleId,
      },
      select: {
        transformerId: true,
      },
    });

    if (!pole) {
      throw new Error(`Pole ${poleId} not found.`);
    }

    return pole.transformerId;
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

      await tx.poleHealth.update({
        where: {
          poleId: snapshot.poleId,
        },
        data: snapshot,
      });
    });
  }
}
