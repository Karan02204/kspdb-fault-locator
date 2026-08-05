import { queryClient } from "../lib/query-client";

type EventHandler = (payload: any) => void;

class EventService {
  private source: EventSource | null = null;
  private handlers = new Map<string, EventHandler[]>();

  connect() {
    if (this.source) return;

    this.source = new EventSource("http://localhost:3000/api/events");

    this.source.onopen = () => {
      console.log("✅ SSE Connected");
    };

    this.source.onerror = (err) => {
      console.error(err);
    };

    this.register("connected");
    this.register("telemetry.received");
    this.register("incident.created");
    this.register("incident.updated");
    this.register("ticket.updated");
  }

  private register(eventName: string) {
    this.source!.addEventListener(eventName, async (event) => {
      const payload = JSON.parse(event.data);

      const handlers = this.handlers.get(eventName) ?? [];
      handlers.forEach((handler) => handler(payload));

      switch (eventName) {
        case "telemetry.received":
          await queryClient.invalidateQueries({ queryKey: ["network"] });
          break;

        case "incident.created":
        case "incident.updated":
          await queryClient.invalidateQueries({ queryKey: ["incidents"] });
          break;

        case "ticket.updated":
          await queryClient.invalidateQueries({ queryKey: ["tickets"] });
          break;
      }
    });
  }

  on(event: string, handler: EventHandler) {
    const handlers = this.handlers.get(event) ?? [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
}

export const eventService = new EventService();
