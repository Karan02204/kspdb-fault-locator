import { useIncidents } from "../../hooks/useIncidents";

export default function OperationalBrief() {
  const { data } = useIncidents();

  const incident = data?.[0];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg m-5">
      <h2 className="font-bold text-lg mb-4">AI Operational Brief</h2>

      {!incident ? (
        <div className="text-green-600">Network operating normally.</div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            <strong>Incident:</strong> {incident.incidentNumber}
          </p>

          <p>
            <strong>Transformer:</strong> {incident.transformerId}
          </p>

          <p>
            <strong>Confidence:</strong>{" "}
            {(incident.confidenceScore * 100).toFixed(0)}%
          </p>

          <p>
            Dispatch crew to inspect the span between{" "}
            <strong>{incident.boundaryFromPoleId}</strong> and{" "}
            <strong>{incident.boundaryToPoleId}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}