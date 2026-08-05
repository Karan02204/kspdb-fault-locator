import { useIncidents } from "../../hooks/useIncidents";
import type { Incident } from "../../types/incident";
import IncidentCard from "./IncidentCard";

interface Props {
  selectedIncident: Incident | null;

  onSelect: (incident: Incident) => void;
}

export default function IncidentPanel({ selectedIncident, onSelect }: Props) {
  const { data, isLoading } = useIncidents();

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg h-full">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Active Incidents</h2>

        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          {data?.length ?? 0}
        </span>
      </div>

      {isLoading && <div>Loading...</div>}

      <div className="space-y-4">
        {data?.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            selected={selectedIncident?.id === incident.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
