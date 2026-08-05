import { useNetwork } from "../../hooks/useNetwork";
import { useIncidents } from "../../hooks/useIncidents";
import { useTickets } from "../../hooks/useTickets";

export default function KPICards() {
  const { data: network } = useNetwork();
  const { data: incidents } = useIncidents();
  const { data: tickets } = useTickets();

  const healthy =
    network?.poles.filter((p: any) => p.health?.healthStatus === "HEALTHY")
      .length ?? 0;

  const offline =
    network?.poles.filter((p: any) => p.health?.healthStatus === "OFFLINE")
      .length ?? 0;

  const confidence = incidents?.length
    ? (incidents.reduce((sum: number, i: any) => sum + i.confidenceScore, 0) /
        incidents.length) *
      100
    : 100;

  const cards = [
    {
      title: "Healthy Poles",
      value: healthy,
      color: "text-green-600",
    },
    {
      title: "Offline Poles",
      value: offline,
      color: "text-red-600",
    },
    {
      title: "Active Incidents",
      value: incidents?.length ?? 0,
      color: "text-orange-600",
    },
    {
      title: "Open Tickets",
      value: tickets?.length ?? 0,
      color: "text-blue-600",
    },
    {
      title: "Avg Confidence",
      value: `${confidence.toFixed(0)}%`,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="m-5 grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl bg-white p-5 shadow-lg">
          <div className="text-sm text-gray-500">{card.title}</div>

          <div className={`mt-2 text-3xl font-bold ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
