import { useIncidents } from "../../hooks/useIncident";
import IncidentCard from "./incidentCard";

export default function IncidentPanel() {
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
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}