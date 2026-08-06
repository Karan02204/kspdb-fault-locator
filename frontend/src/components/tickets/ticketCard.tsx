import { useState } from "react";
import { useUpdateTicket } from "../../hooks/useUpdateTicket";
import type { Ticket } from "../../types/ticket";

interface Props {
  ticket: Ticket;
}

const badgeColors: Record<string, string> = {
  DETECTED: "bg-red-100 text-red-700",
  ACKNOWLEDGED: "bg-yellow-100 text-yellow-700",
  CREW_ASSIGNED: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  VERIFIED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

function getNextStatus(status: string) {
  switch (status) {
    case "DETECTED":
      return "ACKNOWLEDGED";

    case "ACKNOWLEDGED":
      return "CREW_ASSIGNED";

    case "CREW_ASSIGNED":
      return "RESOLVED";

    case "RESOLVED":
      return "VERIFIED";

    case "VERIFIED":
      return "CLOSED";

    default:
      return null;
  }
}

function formatCoordinates(lat: number | null | undefined, lon: number | null | undefined) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return null;
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export default function TicketCard({ ticket }: Props) {
  const { mutate, isPending } = useUpdateTicket();

  const [error, setError] = useState<string | null>(null);

  const nextStatus = getNextStatus(ticket.status);

  const boundaryPole = ticket.incident.boundaryToPole;

  const coordinates = formatCoordinates(boundaryPole?.lat, boundaryPole?.lon);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{ticket.ticketNumber}</h3>

        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${badgeColors[ticket.status]}`}
        >
          {ticket.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <strong>Incident:</strong> {ticket.incident.incidentNumber}
        </div>

        <div>
          <strong>Transformer:</strong> {ticket.incident.transformerId}
        </div>

        <div>
          <strong>Fault Span:</strong> {ticket.incident.boundaryFromPoleId}
          {" → "}
          {ticket.incident.boundaryToPoleId}
        </div>
        <div>
          <strong>PIN Code:</strong>{" "}
          {boundaryPole?.pin ?? "N/A"}
        </div>

        {coordinates && (
          <div>
            <strong>Coordinates:</strong> {coordinates}
          </div>
        )}

        <div>
          <strong>Affected Poles:</strong>{" "}
          {ticket.incident.affectedPoles.length}
        </div>

        <div>
          <strong>Confidence:</strong>{" "}
          {(ticket.incident.confidenceScore * 100).toFixed(1)}%
        </div>

        <div className="text-gray-500 text-xs pt-2">
          Detected {new Date(ticket.detectedAt).toLocaleString()}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {nextStatus && (
          <button
            disabled={isPending}
            onClick={() =>
              mutate(
                {
                  ticketId: ticket.id,
                  status: nextStatus,
                },
                {
                  onError: (err: any) => {
                    setError(
                      err?.response?.data?.error ??
                        err?.message ??
                        "Action failed. If you marked it RESOLVED, the span may still be dark — power must return first.",
                    );
                  },
                  onSuccess: () => setError(null),
                },
              )
            }
            className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Mark as {nextStatus.replaceAll("_", " ")}
          </button>
        )}
      </div>
    </div>
  );
}
