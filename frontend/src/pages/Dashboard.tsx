import DashboardLayout from "../components/layout/DashboardLayout";

import NetworkMap from "../components/map/NetworkMap";

import IncidentPanel from "../components/incidents/IncidentPanel";

import TicketPanel from "../components/tickets/TicketPanel";

import SimulatorPanel from "../components/simulator/SimulatorPanel";

import OperationalBrief from "../components/ai/OperationalBrief";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <NetworkMap />
        </div>

        <div className="col-span-4 flex flex-col gap-6">
          <IncidentPanel />

          <TicketPanel />

          {/* <SimulatorPanel /> */}
        </div>
      </div>

      <div className="mt-6">
        <OperationalBrief />
      </div>
    </DashboardLayout>
  );
}