export interface SubstationImport {
  id: string;
  name: string;
}

export interface FeederImport {
  id: string;
  substationId: string | null;
}

export interface TransformerImport {
  id: string;
  feederId: string;
  latitude: number;
  longitude: number;
  capacityKva: number;
  householdsServed: number;
}

export interface PoleImport {
  id: string;
  latitude: number;
  longitude: number;
  transformerId: string;
  pin: string | null;
}

export interface DeviceImport {
  id: string;
  poleId: string;
}

export interface PoleConnectionImport {
  fromPoleId: string;
  toPoleId: string;
}

export interface NetworkImportData {
  substations: SubstationImport[];
  feeders: FeederImport[];
  transformers: TransformerImport[];
  poles: PoleImport[];
  devices: DeviceImport[];
  connections: PoleConnectionImport[];
}