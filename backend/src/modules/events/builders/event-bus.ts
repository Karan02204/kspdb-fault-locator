import type { Response } from "express";

export class EventBus {
  private clients = new Set<Response>();

  subscribe(res: Response) {
    this.clients.add(res);

    res.on("close", () => {
      this.clients.delete(res);
    });
  }

  publish(event: string, data: unknown) {
    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;

    for (const client of this.clients) {
      client.write(payload);
    }
  }
}

export const eventBus = new EventBus();