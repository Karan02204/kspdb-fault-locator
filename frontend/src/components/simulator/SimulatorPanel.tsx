import { useNetwork } from "../../hooks/useNetwork";
import { useState } from "react";
import { useSimulator } from "../../hooks/useSimulator";

export default function SimulatorPanel() {
  const { data } = useNetwork();

  const [deviceId, setDeviceId] = useState("");
  const { mutate, isPending } = useSimulator();

 const devices = (data?.devices ?? []) as any[];

  const allDeviceIds = devices.map((d: any) => d.id);

  const upstreamDeviceId = devices[1]?.id;

  const downstreamDeviceId = devices[2]?.id;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg m-5">
      <h2 className="mb-5 text-lg font-bold">Simulator</h2>

      <label className="text-sm font-medium">Device</label>

      <select
        className="mt-2 mb-5 w-full rounded-lg border p-2"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
      >
        <option value="">Select Device</option>

        {data?.devices.map((device: any) => (
          <option key={device.id} value={device.id}>
            {device.id}
          </option>
        ))}
      </select>

      <h3 className="mb-2 font-semibold">Device Events</h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isPending || !deviceId}
          onClick={() =>
            mutate({
              action: "boot",
              payload: {
                deviceId,
              },
            })
          }
          className="rounded bg-blue-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "BOOT"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() =>
            mutate({
              action: "power-lost",
              payload: {
                deviceId,
              },
            })
          }
          className="rounded bg-red-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "POWER LOST"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() =>
            mutate({
              action: "power-restored",
              payload: {
                deviceId,
              },
            })
          }
          className="rounded bg-green-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "POWER RESTORED"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() =>
            mutate({
              action: "heartbeat",
              payload: {
                deviceId,
              },
            })
          }
          className="rounded bg-yellow-500 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "HEARTBEAT"}
        </button>
      </div>

      <h3 className="mt-6 mb-2 font-semibold">Fault Injection</h3>

      <div className="space-y-2">
        <button
          className="w-full rounded bg-purple-600 py-2 text-white"
          onClick={() =>
            mutate({
              action: "span-fault",
              payload: {
                upstreamDeviceId,
                downstreamDeviceId,
              },
            })
          }
        >
          Inject Span Fault
        </button>

        <button
          className="w-full rounded bg-orange-600 py-2 text-white"
          onClick={() =>
            mutate({
              action: "transformer-fault",
              payload: {
                deviceIds: allDeviceIds,
              },
            })
          }
        >
          Inject Transformer Fault
        </button>

        <button
          className="w-full rounded bg-gray-700 py-2 text-white"
          onClick={() =>
            mutate({
              action: "repair",
              payload: {
                deviceIds: allDeviceIds,
              },
            })
          }
        >
          Repair Fault
        </button>
      </div>
    </div>
  );
}
