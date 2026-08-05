import type { Incident } from "../../types/incident";

interface Props {
  incident: Incident;

  selected: boolean;

  onSelect: (incident: Incident) => void;
}

export default function IncidentCard({ incident, selected, onSelect }: Props) {
  return (
    <div
      onClick={() => onSelect(incident)}
      className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md ${
        selected
          ? "border-red-500 bg-red-50 shadow-lg"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{incident.incidentNumber}</h3>

        <span className="rounded-full bg-red-600 px-2 py-1 text-xs text-white">
          ACTIVE
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <div>
          <strong>Transformer:</strong> {incident.transformerId}
        </div>

        <div>
          <strong>Fault Boundary:</strong> {incident.boundaryFromPoleId} →{" "}
          {incident.boundaryToPoleId}
        </div>

        <div>
          <strong>Affected Poles:</strong> {incident.affectedPoles.length}
        </div>

        <div>
          <strong>Confidence:</strong>{" "}
          {(incident.confidenceScore * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}