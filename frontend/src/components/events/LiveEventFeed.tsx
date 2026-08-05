import { useEffect, useState } from "react";
import { eventService } from "../../services/sse";

interface EventItem {
  id: string;
  title: string;
  time: string;
}

export default function LiveEventFeed() {
  const [events, setEvents] = useState<EventItem[]>([]);

  function addEvent(title: string) {
    setEvents((prev) =>
      [
        {
          id: crypto.randomUUID(),
          title,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 30),
    );
  }

  useEffect(() => {
    eventService.on("telemetry.received", (payload) => {
      addEvent(`📡 ${payload.event} • ${payload.poleId}`);
    });

    eventService.on("incident.created", (payload) => {
      addEvent(`🚨 ${payload.incidentNumber}`);
    });

    eventService.on("incident.updated", (payload) => {
      addEvent(
        `⚠️ ${payload.incidentNumber} localized to ${payload.boundaryFromPoleId} → ${payload.boundaryToPoleId}`,
      );
    });

    eventService.on("ticket.updated", (payload) => {
      addEvent(`🎫 ${payload.ticketNumber} • ${payload.status}`);
    });
  }, []);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg">
      <h2 className="mb-4 text-lg font-bold">Live Event Feed</h2>

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {events.length === 0 && (
          <div className="text-sm text-gray-500">
            Waiting for live events...
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} className="rounded-lg border p-3 text-sm">
            <div className="font-medium">{event.title}</div>

            <div className="text-xs text-gray-500">{event.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}