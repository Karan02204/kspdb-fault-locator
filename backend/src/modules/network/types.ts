export interface FeederData {
  id: string;
  name: string;
}

export interface DistributionTransformerData {
  id: string;
  name?: string | null;
  lat: number;
  lon: number;
  feederId: string;
}

export interface PoleData {
  id: string;
  pin?: string | null;
  lat: number;
  lon: number;
  transformerId: string;
}

export interface DeviceData {
  id: string;
  poleId: string;
}

export interface PoleConnectionData {
  fromPoleId: string;
  toPoleId: string;
  source: "OFFICIAL" | "MST";
  confidence: number;
}

export interface PoleCsvRow {
  pole_id: string;
  lat: string;
  lon: string;
  feeder_id: string;
  dt_id: string;
  seq_on_line?: string;
  parent_pole_id?: string;
  pole_type?: string;
  ward?: string;
  pincode?: string;
  device_id?: string;
}

export interface TransformerCsvRow {
  dt_id: string;
  feeder_id: string;
  lat: string;
  lon: string;
  capacity_kva: string;
  households_served: string;
}

export interface NetworkImportData {
  feeders: FeederData[];
  transformers: DistributionTransformerData[];
  poles: PoleData[];
  devices: DeviceData[];
  connections: PoleConnectionData[];
}