import { EventType, HealthStatus } from "../../../generated/prisma/enums";

export interface TelemetryPayload {
  deviceId: string;
  eventType: EventType;

  sequenceNumber: number;

  deviceTimestamp: Date;

  batteryMv: number | null;

  rssi: number | null;

  firmwareVersion: string | null;
}

export interface PoleHealthSnapshot {
  poleId: string;

  deviceId: string;

  isEnergized: boolean | null;

  lastEventType: EventType;

  lastSequenceNumber: number;

  lastDeviceTimestamp: Date;

  lastReceivedAt: Date;

  lastHeartbeatAt?: Date;

  batteryMv: number | null;

  rssi: number | null;

  firmwareVersion: string | null;

  healthStatus: HealthStatus;
}

export enum PoleStateEvent {
  POLE_DARK = "POLE_DARK",
  POLE_LIVE = "POLE_LIVE",
  HEARTBEAT = "HEARTBEAT",
  DEVICE_BOOTED = "DEVICE_BOOTED",
}

export interface NormalizedTelemetry {
  deviceId: string;

  event: PoleStateEvent;

  sequenceNumber: number;

  deviceTimestamp: Date;

  batteryMv: number | null;

  rssi: number | null;

  firmwareVersion: string | null;

  originalEvent: EventType;
}