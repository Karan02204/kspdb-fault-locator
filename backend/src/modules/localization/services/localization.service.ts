import { LocalizationRepository } from "../repositories/localization.repository.js";
import { LocalizationEngine } from "../builders/localization.engine.js";

import type { LocalizedFault } from "../types.js";

export class LocalizationService {
  private repository = new LocalizationRepository();

  private engine = new LocalizationEngine();

  async localizeTransformer(transformerId: string): Promise<LocalizedFault[]> {
    const connections =
      await this.repository.getTopologyConnections(transformerId);

    const poleStates = await this.repository.getPoleStates(transformerId);

    if (connections.length === 0) {
      return [];
    }

    if (poleStates.length === 0) {
      return [];
    }

    return this.engine.localize(transformerId, connections, poleStates);
  }
}
