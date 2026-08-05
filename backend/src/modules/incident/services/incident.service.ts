import { LocalizationService } from "../../localization/services/localization.service.js";
import { ConfidenceRepository } from "../../confidence/repositories/confidence.repository.js";
import { ConfidenceEngine } from "../../confidence/builders/confidence.engine.js";

import { IncidentRepository } from "../repositories/incident.repository.js";
import { IncidentGrouper } from "../builders/incident-grouper.js";

import type { Incident } from "../types.js";

export class IncidentService {
  private static readonly INCIDENT_CREATION_THRESHOLD = 0.7;

  private localizationService = new LocalizationService();

  private confidenceRepository = new ConfidenceRepository();

  private confidenceEngine = new ConfidenceEngine();

  private incidentRepository = new IncidentRepository();

  private incidentGrouper = new IncidentGrouper();

  async processTransformer(transformerId: string): Promise<Incident[]> {
    const localizedFaults =
      await this.localizationService.localizeTransformer(transformerId);

    if (localizedFaults.length === 0) {
      return [];
    }

    const openIncidents =
      await this.incidentRepository.findOpenIncidents(transformerId);

    const feederId = await this.confidenceRepository.getFeederId(transformerId);

    const maintenance =
      await this.confidenceRepository.getMaintenanceEvents(transformerId);

    const processedIncidents: Incident[] = [];

    for (const fault of localizedFaults) {
      const affectedPoleStates =
        await this.localizationService.getPoleStatesByIds(fault.affectedPoles);

      const poleHealth = await this.confidenceRepository.getPoleHealthSnapshots(
        fault.affectedPoles,
      );

      const confidence = this.confidenceEngine.evaluate({
        fault,

        telemetry: {
          affectedPoleStates,
        },

        boundary: {
          fault,
        },

        sensorHealth: {
          poleHealth,
        },

        maintenance: {
          transformerId,

          feederId,

          maintenance,
        },
      });

      const candidate = {
        fault,
        confidence,
      };

      const grouping = this.incidentGrouper.findMatchingIncident(
        candidate,
        openIncidents,
      );

      if (grouping.isNewIncident) {
        if (
          confidence.overallScore < IncidentService.INCIDENT_CREATION_THRESHOLD
        ) {
          continue;
        }

        const incident =
          await this.incidentRepository.createIncident(candidate);

        await this.incidentRepository.createTicket(incident.id);

        processedIncidents.push(incident);

        openIncidents.push(incident);

        continue;
      }

      const updatedIncident = await this.incidentRepository.updateIncident(
        grouping.existingIncident!.id,
        candidate,
      );

      processedIncidents.push(updatedIncident);
    }

    return processedIncidents;
  }
}