import { LocalizationService } from "../../localization/services/localization.service.js";
import { ConfidenceRepository } from "../../confidence/repositories/confidence.repository.js";
import { ConfidenceEngine } from "../../confidence/builders/confidence.engine.js";

import { IncidentRepository } from "../repositories/incident.repository.js";
import { IncidentGrouper } from "../builders/incident-grouper.js";
import { outageDebouncer } from "../builders/outage-debouncer.js";
import { transformerMutex } from "../../../lib/keyed-mutex.js";

import type { Incident } from "../types.js";
import type { MaintenanceSnapshot } from "../../confidence/type.js";
import { eventBus } from "../../events/builders/event-bus.js";

export class IncidentService {
  private static readonly INCIDENT_CREATION_THRESHOLD = 0.7;

  /**
   * If darkness survives a scheduled-outage window by more than this grace
   * period, it is treated as a real fault: the data contract warns that
   * shutdowns overrun by 20-40 minutes and ~1 in 10 is cancelled without the
   * feed being updated, so the window cannot be trusted as gospel.
   */
  private static readonly MAINTENANCE_GRACE_MS = 15 * 60 * 1000;

  private localizationService = new LocalizationService();

  private confidenceRepository = new ConfidenceRepository();

  private confidenceEngine = new ConfidenceEngine();

  private incidentRepository = new IncidentRepository();

  private incidentGrouper = new IncidentGrouper();

  /**
   * Re-evaluate a transformer's outages. Serialized per transformer so two
   * concurrent dark packets cannot both read "no open incident" and create
   * duplicate incidents (burst-safe).
   */
  async processTransformer(transformerId: string): Promise<Incident[]> {
    return transformerMutex.run(transformerId, () =>
      this.processTransformerUnsafe(transformerId),
    );
  }

  private async processTransformerUnsafe(
    transformerId: string,
  ): Promise<Incident[]> {
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

    const activeMaintenance = this.findActiveMaintenance(
      maintenance,
      transformerId,
      feederId,
      new Date(),
    );

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
        // --------------------------------------------------------------
        // Scheduled-outage suppression: darkness inside an advertised
        // maintenance window is expected, not a fault. Do not create an
        // incident/ticket; schedule a re-check shortly after the window
        // ends so a genuine fault that outlives the window still surfaces.
        // --------------------------------------------------------------
        if (activeMaintenance) {
          this.schedulePostMaintenanceRecheck(
            transformerId,
            activeMaintenance,
            feederId,
          );

          continue;
        }

        if (
          confidence.overallScore < IncidentService.INCIDENT_CREATION_THRESHOLD
        ) {
          continue;
        }

        const incident =
          await this.incidentRepository.createIncident(candidate);

        const ticket = await this.incidentRepository.createTicket(incident.id);
        eventBus.publish("incident.created", incident);
        eventBus.publish("ticket.updated", ticket);

        processedIncidents.push(incident);

        openIncidents.push(incident);

        continue;
      }

      const updatedIncident = await this.incidentRepository.updateIncident(
        grouping.existingIncident!.id,
        candidate,
      );

      eventBus.publish("incident.updated", updatedIncident);

      processedIncidents.push(updatedIncident);
    }

    return processedIncidents;
  }

  private findActiveMaintenance(
    maintenance: MaintenanceSnapshot[],
    transformerId: string,
    feederId: string,
    now: Date,
  ): MaintenanceSnapshot | null {
    return (
      maintenance.find((window) => {
        const active = now >= window.start && now <= window.end;

        if (!active) {
          return false;
        }

        if (window.scope === "DT") {
          return window.targetId === transformerId;
        }

        return window.targetId === feederId;
      }) ?? null
    );
  }

  private schedulePostMaintenanceRecheck(
    transformerId: string,
    window: MaintenanceSnapshot,
    feederId: string,
  ): void {
    const recheckAt = new Date(window.end.getTime() + IncidentService.MAINTENANCE_GRACE_MS);

    const delayMs = Math.max(0, recheckAt.getTime() - Date.now());

    // Key must not collide with the detection window key (`transformerId`),
    // otherwise a live event cancelling the detection window would also
    // cancel the maintenance re-check.
    const key = `maintenance-recheck:${transformerId}:${feederId}`;

    outageDebouncer.schedule(key, () => this.processTransformer(transformerId), delayMs);
  }

  async getIncidents() {
    return this.incidentRepository.getIncidents();
  }

  async getActiveIncidents() {
    return this.incidentRepository.getActiveIncidents();
  }

  async getIncidentHistory() {
    return this.incidentRepository.getIncidentHistory();
  }

  async getIncidentById(id: string) {
    const incident = await this.incidentRepository.getIncidentById(id);

    if (!incident) {
      throw new Error("Incident not found.");
    }

    return incident;
  }
}
