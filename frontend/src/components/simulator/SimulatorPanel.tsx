import { useNetwork } from "../../hooks/useNetwork";
import { useState } from "react";
import { useSimulator } from "../../hooks/useSimulator";

export default function SimulatorPanel() {
  const { data } = useNetwork();

  const [deviceId, setDeviceId] = useState("");
  const [transformerId, setTransformerId] = useState("");
  const [feederId, setFeederId] = useState("");
  const [noise, setNoise] = useState(false);
  const { mutate, isPending } = useSimulator();

  const devices = (data?.devices ?? []) as any[];

  const transformers = (data?.transformers ?? []) as any[];

  const feeders = (data?.feeders ?? []) as any[];

  const firstTransformerId = transformers[0]?.id ?? "";

  const firstFeederId = feeders[0]?.id ?? "";

  const effectiveTransformerId = transformerId || firstTransformerId;

  const effectiveFeederId = feederId || firstFeederId;

  const poleByDevice = new Map(
    (data?.poles ?? []).map((pole: any) => [pole.id, pole]),
  );

  const transformerDevices = devices.filter((d: any) => {
    const pole = poleByDevice.get(d.poleId);

    return pole?.transformerId === effectiveTransformerId;
  });

  const allDeviceIds = transformerDevices.map((d: any) => d.id);

  const upstreamDeviceId = transformerDevices[1]?.id;

  const downstreamDeviceId = transformerDevices[2]?.id;

  const run = (action: string, payload: Record<string, unknown>) =>
    mutate({ action, payload: { ...payload, noise } });

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg m-5">
      <h2 className="mb-5 text-lg font-bold">Simulator</h2>

      <label className="text-sm font-medium">Transformer</label>

      <select
        className="mt-2 mb-5 w-full rounded-lg border p-2"
        value={effectiveTransformerId}
        onChange={(e) => setTransformerId(e.target.value)}
      >
        {transformers.map((t: any) => (
          <option key={t.id} value={t.id}>
            {t.id}
          </option>
        ))}
      </select>

      <label className="text-sm font-medium">Feeder</label>

      <select
        className="mt-2 mb-5 w-full rounded-lg border p-2"
        value={effectiveFeederId}
        onChange={(e) => setFeederId(e.target.value)}
      >
        {feeders.map((f: any) => (
          <option key={f.id} value={f.id}>
            {f.id}
          </option>
        ))}
      </select>

      <label className="text-sm font-medium">Device</label>

      <select
        className="mt-2 mb-5 w-full rounded-lg border p-2"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
      >
        <option value="">Select Device</option>

        {transformerDevices.map((device: any) => (
          <option key={device.id} value={device.id}>
            {device.id}
          </option>
        ))}
      </select>

      <label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={noise}
          onChange={(e) => setNoise(e.target.checked)}
        />
        Realistic noise (30% lost dying-messages, firmware-1.2 silence,
        duplicates, out-of-order retries)
      </label>

      <h3 className="mt-4 mb-2 font-semibold">Device Events</h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isPending || !deviceId}
          onClick={() => run("boot", { deviceId })}
          className="rounded bg-blue-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "BOOT"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() => run("power-lost", { deviceId })}
          className="rounded bg-red-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "POWER LOST"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() => run("power-restored", { deviceId })}
          className="rounded bg-green-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "POWER RESTORED"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() => run("heartbeat", { deviceId })}
          className="rounded bg-yellow-500 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "HEARTBEAT"}
        </button>

        <button
          disabled={isPending || !deviceId}
          onClick={() => run("device-failure", { deviceId })}
          className="rounded bg-gray-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running..." : "KILL DEVICE (power stays on)"}
        </button>
      </div>

      <h3 className="mt-6 mb-2 font-semibold">Fault Injection</h3>

      <div className="space-y-2">
        <button
          disabled={isPending || !upstreamDeviceId || !downstreamDeviceId}
          onClick={() =>
            run("span-fault", {
              upstreamDeviceId,
              downstreamDeviceId,
            })
          }
          className="w-full rounded bg-purple-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Inject Span Fault
        </button>

        <button
          disabled={isPending || allDeviceIds.length === 0}
          onClick={() =>
            run("transformer-fault", {
              deviceIds: allDeviceIds,
            })
          }
          className="w-full rounded bg-orange-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Inject Transformer Fault
        </button>

        <button
          disabled={isPending}
          onClick={() => run("feeder-fault", { feederId: effectiveFeederId })}
          className="w-full rounded bg-red-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Inject Feeder Fault
        </button>

        <button
          disabled={isPending}
          onClick={() => run("maintenance", { scope: "FEEDER", targetId: effectiveFeederId })}
          className="w-full rounded bg-teal-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Scheduled Outage (30 min)
        </button>

        <button
          disabled={isPending || allDeviceIds.length === 0}
          onClick={() =>
            run("repair", {
              deviceIds: allDeviceIds,
            })
          }
          className="w-full rounded bg-gray-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Repair Fault (restore transformer)
        </button>
      </div>
    </div>
  );
}
