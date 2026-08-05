import { parse } from "csv-parse/sync";
import { NetworkRepository } from "../repositories/network.repository.js";
import { NetworkQueryRepository } from "../repositories/network-query.repository.js";
import { TopologyService } from "../../topology/services/topology.service.js";
import type {
  NetworkImportData,
  FeederData,
  DistributionTransformerData,
  PoleData,
  DeviceData,
  PoleConnectionData,
  PoleCsvRow,
  TransformerCsvRow,
} from "../types.js";
import { HealthStatus, PoleStateEvent } from "../../../../generated/prisma/enums.js";

export class NetworkService {
  private networkRepository: NetworkRepository;
  private networkQueryRepository: NetworkQueryRepository;
  private topologyService = new TopologyService();

  constructor() {
    this.networkRepository = new NetworkRepository();
    this.networkQueryRepository = new NetworkQueryRepository();
  }

  async importNetwork(polesFileBuffer: Buffer, transformersFileBuffer: Buffer) {
    // Parse CSVs
    const transformersRecords = parse(transformersFileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as TransformerCsvRow[];

    const polesRecords = parse(polesFileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as PoleCsvRow[];

    const feedersMap = new Map<string, FeederData>();
    const transformersMap = new Map<string, DistributionTransformerData>();
    const polesMap = new Map<string, PoleData>();
    const devicesMap = new Map<string, DeviceData>();
    const connections: PoleConnectionData[] = [];

    // Process Transformers Registry
    for (const record of transformersRecords) {
      if (!record.dt_id || !record.feeder_id || !record.lat || !record.lon) {
        throw new Error(
          `Missing required columns in Transformers CSV. Found: ${JSON.stringify(record)}`,
        );
      }

      if (!feedersMap.has(record.feeder_id)) {
        feedersMap.set(record.feeder_id, {
          id: record.feeder_id,
          name: record.feeder_id, // Using feeder_id as name since it's not provided
        });
      }

      if (!transformersMap.has(record.dt_id)) {
        transformersMap.set(record.dt_id, {
          id: record.dt_id,
          lat: parseFloat(record.lat),
          lon: parseFloat(record.lon),
          feederId: record.feeder_id,
        });
      }
    }

    // Process Poles Registry
    for (const record of polesRecords) {
      if (!record.pole_id || !record.lat || !record.lon || !record.dt_id) {
        throw new Error(
          `Missing required columns in Poles CSV. Found: ${JSON.stringify(record)}`,
        );
      }

      if (record.feeder_id && !feedersMap.has(record.feeder_id)) {
        feedersMap.set(record.feeder_id, {
          id: record.feeder_id,
          name: record.feeder_id,
        });
      }

      if (!polesMap.has(record.pole_id)) {
        polesMap.set(record.pole_id, {
          id: record.pole_id,
          pin: record.pincode || null,
          lat: parseFloat(record.lat),
          lon: parseFloat(record.lon),
          transformerId: record.dt_id,
        });
      }

      if (record.device_id) {
        if (!devicesMap.has(record.device_id)) {
          devicesMap.set(record.device_id, {
            id: record.device_id,
            poleId: record.pole_id,
          });
        }
      }
    }

    const deviceByPole = new Map(
      Array.from(devicesMap.values()).map((device) => [
        device.poleId,
        device.id,
      ]),
    );

    for (const record of polesRecords) {
      const parentPoleId = record.parent_pole_id?.trim();
      const poleId = record.pole_id.trim();

      if (
        !parentPoleId ||
        parentPoleId === "" ||
        parentPoleId.toUpperCase() === "NULL"
      ) {
        continue;
      }

      if (!polesMap.has(parentPoleId)) {
        console.warn(`Skipping connection: ${parentPoleId} -> ${poleId}`);
        continue;
      }

      connections.push({
        fromPoleId: parentPoleId,
        toPoleId: poleId,
        source: "OFFICIAL",
        confidence: 1.0,
      });
    }

    const poleHealth = Array.from(polesMap.values()).map((pole) => ({
      poleId: pole.id,

      deviceId: deviceByPole.get(pole.id) ?? null,

      isEnergized: null,

      healthStatus: HealthStatus.UNKNOWN,

      lastPoleStateEvent: PoleStateEvent.UNKNOWN,

      lastSequenceNumber: null,

      lastDeviceTimestamp: null,

      lastReceivedAt: null,

      lastHeartbeatAt: null,

      batteryMv: null,

      rssi: null,

      firmwareVersion: null,
    }));

    const data: NetworkImportData = {
      feeders: Array.from(feedersMap.values()),
      transformers: Array.from(transformersMap.values()),
      poles: Array.from(polesMap.values()),
      devices: Array.from(devicesMap.values()),
      connections,
      poleHealth,
    };

    await this.networkRepository.importNetwork(data);

    // Automatically infer missing topology
    await this.topologyService.inferMissingTopology();

    return {
      success: true,
    };
  }

  async getNetwork() {
    return this.networkQueryRepository.getNetwork();
  }

  async getNetworkStats() {
    return this.networkQueryRepository.getNetworkStats();
  }
}
