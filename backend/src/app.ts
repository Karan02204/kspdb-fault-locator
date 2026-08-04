import express from "express";
import networkRoutes from "./modules/network/routes/network.routes.js";
import telemetryRoutes from "./modules/telemetry/routes/telemetry.route.js";
import topologyRoutes from "./modules/topology/routes/topology.route.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});


app.use("/api/network", networkRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/topology" , topologyRoutes);
export default app;