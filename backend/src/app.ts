import express from "express";
import networkRoutes from "./modules/network/routes/network.routes.js";
import telemetryRoutes from "./modules/telemetry/routes/telemetry.route.js";
import topologyRoutes from "./modules/topology/routes/topology.route.js";
import localizationRoutes from "./modules/localization/routes/localization.route.js";
import incidentRoutes from "./modules/incident/routes/incident.route.js";
import { HeartbeatMonitor } from "./modules/telemetry/builders/heartbeat-monitor.js";
import ticketRoutes from "./modules/incident/routes/ticket.route.js";
import sseRoutes from "./modules/events/routes/sse.routes.js";
import simulatorRoutes from "./modules/simulator/routes/simulator.route.js";
import cors from "cors";

const app = express();

const heartbeatMonitor = new HeartbeatMonitor();
heartbeatMonitor.start();

app.use(express.json());
app.use(cors());

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});


app.use("/api/network", networkRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/topology" , topologyRoutes);
app.use("/api/localization", localizationRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/events", sseRoutes);
app.use("/api/simulator", simulatorRoutes);

// JSON error handler (registered last) so the operator console can surface
// actionable messages (e.g. "Power has not been restored") instead of an
// HTML 500.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    console.error("[api-error]", message, err);

    res.status(500).json({ error: message });
  },
);

export default app;