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

export default function TicketCard({ ticket }: Props) {
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
      </div>
    </div>
  );
}
