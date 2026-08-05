export interface PoleHealth {
  poleId: string;
  isEnergized: boolean | null;
  healthStatus: "HEALTHY" | "OFFLINE" | "UNKNOWN";
  lastHeartbeatAt: string | null;
  lastPoleStateEvent: string;
}

export interface Pole {
  id: string;
  pin: string | null;
  lat: number;
  lon: number;
  transformerId: string;

  health: PoleHealth | null;
}

export interface Transformer {
  id: string;
  lat: number;
  lon: number;
}

export interface PoleConnection {
  id: string;

  fromPoleId: string;
  toPoleId: string;

  source: "OFFICIAL" | "INFERRED";

  confidence: number;
}

export interface NetworkResponse {
  feeders: unknown[];

  transformers: Transformer[];

  poles: Pole[];

  devices: unknown[];

  connections: PoleConnection[];
}