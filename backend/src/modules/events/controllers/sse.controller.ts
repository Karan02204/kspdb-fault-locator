import type { Request, Response } from "express";

import { eventBus } from "../builders/event-bus.js";

export class SSEController {
  connect(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");

    res.setHeader("Cache-Control", "no-cache");

    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    res.write("event: connected\n" + 'data: {"status":"connected"}\n\n');

    eventBus.subscribe(res);

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 30000);

    res.on("close", () => {
      clearInterval(heartbeat);
    });
  }
}