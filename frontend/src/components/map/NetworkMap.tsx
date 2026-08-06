import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import type { Pole } from "../../types/network";
import type { Incident } from "../../types/incident";

import { useNetwork } from "../../hooks/useNetwork";

interface Props {
  selectedIncident: Incident | null;
}

function getPoleColor(pole: any) {
  const health = pole.health;

  if (!health) {
    return "#9ca3af"; // Unknown
  }

  if (health.isEnergized === false) {
    return "#dc2626"; // Red
  }

  // Heartbeat timeout (10 minutes)
  if (health.lastHeartbeatAt) {
    const age = Date.now() - new Date(health.lastHeartbeatAt).getTime();

    if (age > 10 * 60 * 1000) {
      return "#f59e0b"; // Orange
    }
  }

  if (health.healthStatus === "OFFLINE") {
    return "#dc2626"; // Red
  }

  if (health.healthStatus === "UNKNOWN") {
    return "#9ca3af"; // Gray
  }

  if (health.isEnergized === false) {
    return "#dc2626"; // Red
  }

  return "#16a34a"; // Healthy
}

export default function NetworkMap({ selectedIncident }: Props) {
  const { data, isLoading, isError } = useNetwork();

  if (isLoading) {
    return (
      <div className="h-[820px] rounded-2xl bg-white shadow-lg flex items-center justify-center">
        Loading network...
      </div>
    );
  }

  if (isError || !data || data.transformers.length === 0) {
    return (
      <div className="h-[820px] rounded-2xl bg-white shadow-lg flex items-center justify-center text-red-500">
        Failed to load network.
      </div>
    );
  }

  const transformer = data.transformers[0];

  const center: [number, number] = [transformer.lat, transformer.lon];

  const poleMap = new Map(data.poles.map((pole: Pole) => [pole.id, pole]));

  // Root pole (nearest to transformer)
  const rootPole = data.poles.reduce((nearest: Pole, pole: Pole) => {
    const currentDistance =
      Math.pow(pole.lat - transformer.lat, 2) +
      Math.pow(pole.lon - transformer.lon, 2);

    const nearestDistance =
      Math.pow(nearest.lat - transformer.lat, 2) +
      Math.pow(nearest.lon - transformer.lon, 2);

    return currentDistance < nearestDistance ? pole : nearest;
  });

  return (
    <div className="relative h-[820px] rounded-2xl overflow-hidden bg-white shadow-lg m-5 ">
      <MapContainer center={center} zoom={18} className="h-full w-full">
        <TileLayer
          attribution="© OpenStreetMap © CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Transformer → Root Pole */}
        <Polyline
          positions={[
            [transformer.lat, transformer.lon],
            [rootPole.lat, rootPole.lon],
          ]}
          pathOptions={{
            color: "#2563eb",
            weight: 5,
          }}
        />

        {/* Transformers */}
        {data.transformers.map((dt: any) => (
          <CircleMarker
            key={dt.id}
            center={[dt.lat, dt.lon]}
            radius={10}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Tooltip>
              <strong>Transformer</strong>
              <br />
              {dt.id}
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Poles */}
        {data.poles.map((pole: any) => {
          let color = getPoleColor(pole);

          if (selectedIncident?.affectedPoles.includes(pole.id)) {
            color = "#9333ea";
          }

          return (
            <CircleMarker
              key={pole.id}
              center={[pole.lat, pole.lon]}
              radius={6}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Tooltip>
                <strong>{pole.id}</strong>

                <br />

                {pole.health?.healthStatus ?? "UNKNOWN"}

                <br />

                {pole.health?.isEnergized ? "Energized" : "De-energized"}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Connections */}
        {data.connections.map((connection: any) => {
          const from = poleMap.get(connection.fromPoleId);
          const to = poleMap.get(connection.toPoleId);

          if (!from || !to) {
            return null;
          }
          

          let lineColor =
            connection.source === "OFFICIAL" ? "#2563eb" : "#9333ea";

          let weight = 4;

          if (
            selectedIncident &&
            connection.fromPoleId === selectedIncident.boundaryFromPoleId &&
            connection.toPoleId === selectedIncident.boundaryToPoleId
          ) {
            lineColor = "#ef4444";

            weight = 8;
          }

          return (
            <Polyline
              key={connection.id}
              positions={[
                [from.lat, from.lon],
                [to.lat, to.lon],
              ]}
              pathOptions={{
                color: lineColor,

                weight,

                dashArray: connection.source === "OFFICIAL" ? undefined : "8 8",
              }}
            >
              <Tooltip>
                <strong>{connection.source}</strong>
                <br />
                Confidence: {(connection.confidence * 100).toFixed(0)}%
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-white shadow-xl p-4 text-sm">
        <h3 className="mb-3 font-semibold">Network Legend</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            <span>Transformer</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600" />
            <span>Healthy Pole</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-600" />
            <span>Power Lost</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>Heartbeat Timeout</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span>Unknown</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-[3px] w-8 bg-blue-600" />
            <span>Official Topology</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="h-[3px] w-8"
              style={{
                background:
                  "repeating-linear-gradient(to right, #9333ea 0 6px, transparent 6px 10px)",
              }}
            />
            <span>Inferred Topology</span>
          </div>
        </div>
      </div>
    </div>
  );
}