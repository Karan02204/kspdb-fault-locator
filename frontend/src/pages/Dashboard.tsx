import { useEffect, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
import NetworkMap from "../components/map/NetworkMap";
import IncidentPanel from "../components/incidents/IncidentPanel";
import TicketPanel from "../components/tickets/TicketPanel";
import SimulatorPanel from "../components/simulator/SimulatorPanel";
import OperationalBrief from "../components/ai/OperationalBrief";
import LiveEventFeed from "../components/events/LiveEventFeed";
import { useImportNetwork } from "../hooks/useImportNetwork";

import type { Incident } from "../types/incident";
import KPICards from "../components/dashboard/KPICards";
import { useIncidents } from "../hooks/useIncidents";

export default function Dashboard() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );

  const [polesFile, setPolesFile] = useState<File | null>(null);
  const [transformersFile, setTransformersFile] = useState<File | null>(null);

  const { mutate: importNetwork, isPending } = useImportNetwork();
  const { data: incidents } = useIncidents();

  useEffect(() => {
    if (
      selectedIncident &&
      !incidents?.some((i) => i.id === selectedIncident.id)
    ) {
      setSelectedIncident(null);
    }
  }, [incidents, selectedIncident]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setPolesFile(e.target.files?.[0] ?? null)}
        />

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setTransformersFile(e.target.files?.[0] ?? null)}
        />

        <button
          disabled={isPending || !polesFile || !transformersFile}
          onClick={() =>
            importNetwork({
              poles: polesFile!,
              transformers: transformersFile!,
            })
          }
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Importing..." : "Import Network"}
        </button>
      </div>
      <KPICards />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <NetworkMap selectedIncident={selectedIncident} />
          <SimulatorPanel />
          <OperationalBrief />
        </div>

        <div className="col-span-4 flex flex-col gap-6">
          <IncidentPanel
            selectedIncident={selectedIncident}
            onSelect={setSelectedIncident}
          />
          <TicketPanel />
          <LiveEventFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}
