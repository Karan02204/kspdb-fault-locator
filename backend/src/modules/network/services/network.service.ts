import fs from "fs/promises";
import { parse } from "csv-parse/sync";

import type {
  NetworkImportData,
  FeederImport,
  TransformerImport,
  PoleImport,
  DeviceImport,
  PoleConnectionImport,
} from "../types";
import { NetworkRepository } from "../repositories/network.repository";

export class NetworkService {
  private readonly repository = new NetworkRepository();

  async importNetwork(polesCsvPath: string, transformersCsvPath: string) {
    const poles = await this.readCsv(polesCsvPath);
    const transformers = await this.readCsv(transformersCsvPath);

    console.log(`Loaded ${poles.length} poles`);
    console.log(`Loaded ${transformers.length} transformers`);

    const network = this.buildNetwork(poles, transformers);

    await this.repository.importNetwork(network);

    return {
      success: true,
      summary: {
        poles: poles.length,
        transformers: transformers.length,
      },
    };
  }

  private async readCsv(filePath: string) {
    const file = await fs.readFile(filePath);

    return parse(file, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  private buildNetwork(poles: any[], transformers: any[]): NetworkImportData {
    const feederMap = new Map<string, FeederImport>();

    for (const row of transformers) {
      if (!feederMap.has(row.feeder_id)) {
        feederMap.set(row.feeder_id, {
          id: row.feeder_id,
          substationId: null,
        });
      }
    }

    const transformerImports: TransformerImport[] = transformers.map((row) => ({
      id: row.dt_id,
      feederId: row.feeder_id,
      latitude: Number(row.lat),
      longitude: Number(row.lon),
      capacityKva: Number(row.capacity_kva),
      householdsServed: Number(row.households_served),
    }));

    const poleImports: PoleImport[] = poles.map((row) => ({
      id: row.pole_id,
      latitude: Number(row.lat),
      longitude: Number(row.lon),
      transformerId: row.dt_id,
      pin: row.pincode || null,
    }));

    const deviceImports: DeviceImport[] = poles
      .filter((row) => row.device_id)
      .map((row) => ({
        id: row.device_id,
        poleId: row.pole_id,
      }));


    const connectionImports: PoleConnectionImport[] = poles
      .filter((row) => row.parent_pole_id)
      .map((row) => ({
        fromPoleId: row.parent_pole_id,
        toPoleId: row.pole_id,
      }));


    return {
      substations: [],
      feeders: [...feederMap.values()],
      transformers: transformerImports,
      poles: poleImports,
      devices: deviceImports,
      connections: connectionImports,
    };
  }
}
