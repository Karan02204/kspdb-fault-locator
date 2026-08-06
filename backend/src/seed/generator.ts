/**
 * Pure synthetic-network generator (no DB access) — testable in isolation.
 *
 * Shape matches the assignment's data contract:
 *  - radial LT lines with 1-4 branches, 25-45 m pole spacing
 *  - ~60% of transformers with NO official pole ordering
 *  - ~9% of poles without a device, ~3% missing pincode
 *  - ~8% of devices on firmware 1.2.x (silent on power loss)
 */

export const FEEDERS = [
  { id: "F-01-01", lat: 12.9668, lon: 77.5932 },
  { id: "F-01-02", lat: 12.9682, lon: 77.5954 },
  { id: "F-01-03", lat: 12.9698, lon: 77.5912 },
] as const;

export const TRANSFORMERS_PER_FEEDER = 5;

export const POLES_PER_TRANSFORMER_MIN = 40;

export const POLES_PER_TRANSFORMER_MAX = 80;

export const MISSING_ORDERING_DT_FRACTION = 0.6;

export const NO_DEVICE_FRACTION = 0.09;

export const MISSING_PIN_FRACTION = 0.03;

export const FIRMWARE_1_2_FRACTION = 0.08;

const PINCODES = ["560001", "560002", "560003", "560004", "560005", "560078"];

export interface GeneratedTransformer {
  dtId: string;
  feederId: string;
  lat: number;
  lon: number;
  poles: {
    poleId: string;
    lat: number;
    lon: number;
    parentPoleId: string;
    seqOnLine: number | null;
    ward: string;
    pin: string;
    deviceId: string | null;
    firmware: string;
  }[];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function degreesPerMetreLat(): number {
  return 1 / 111_320;
}

function degreesPerMetreLon(lat: number): number {
  return 1 / (111_320 * Math.cos((lat * Math.PI) / 180));
}

export function generateTransformer(
  feederIndex: number,
  transformerIndex: number,
): GeneratedTransformer {
  const feeder = FEEDERS[feederIndex]!;

  const dtId = `D-${String(transformerIndex + 1).padStart(4, "0")}`;

  const dtLat = feeder.lat + randomBetween(-0.0012, 0.0012);

  const dtLon = feeder.lon + randomBetween(-0.0012, 0.0012);

  const poles: GeneratedTransformer["poles"] = [];

  const hasOfficialOrdering = Math.random() > MISSING_ORDERING_DT_FRACTION;

  let poleCounter = 0;

  const nextPoleId = () =>
    `P-${String(transformerIndex * 100 + poleCounter + 1).padStart(6, "0")}`;

  const addPole = (
    lat: number,
    lon: number,
    parentPoleId: string | null,
    ward: string,
  ) => {
    poleCounter++;

    const seqOnLine = hasOfficialOrdering ? poleCounter : null;

    const hasDevice = Math.random() >= NO_DEVICE_FRACTION;

    const pin = Math.random() < MISSING_PIN_FRACTION ? "" : PINCODES[transformerIndex % PINCODES.length]!;

    const firmware =
      hasDevice && Math.random() < FIRMWARE_1_2_FRACTION
        ? "1.2.4"
        : "1.4.2";

    poles.push({
      poleId: nextPoleId(),
      lat,
      lon,
      parentPoleId: parentPoleId ?? "",
      seqOnLine,
      ward,
      pin,
      deviceId: hasDevice
        ? `KSPDB-SD${String(feederIndex + 1).padStart(2, "0")}-${dtId}-${String(poleCounter).padStart(4, "0")}`
        : null,
      firmware,
    });

    return poles[poles.length - 1]!;
  };

  const ward = `W-${String((transformerIndex % 16) + 1).padStart(3, "0")}`;

  // ---------------------------------------------------------------
  // Main line: random walk away from the transformer.
  // ---------------------------------------------------------------
  const mainCount = Math.floor(
    randomBetween(POLES_PER_TRANSFORMER_MIN, POLES_PER_TRANSFORMER_MAX * 0.6),
  );

  let heading = randomBetween(0, Math.PI * 2);

  let prev = addPole(
    dtLat + degreesPerMetreLat() * randomBetween(8, 18),
    dtLon + degreesPerMetreLon(dtLat) * randomBetween(8, 18),
    null,
    ward,
  );

  for (let i = 1; i < mainCount; i++) {
    heading += randomBetween(-0.5, 0.5);

    const distance = randomBetween(25, 45);

    const lat = prev.lat + degreesPerMetreLat() * Math.sin(heading) * distance;

    const lon = prev.lon + degreesPerMetreLon(prev.lat) * Math.cos(heading) * distance;

    prev = addPole(lat, lon, hasOfficialOrdering ? prev.poleId : "", ward);
  }

  // ---------------------------------------------------------------
  // Branches off the main line.
  // ---------------------------------------------------------------
  const branchCount = Math.floor(randomBetween(1, 4));

  for (let b = 0; b < branchCount; b++) {
    const attachIndex = Math.floor(randomBetween(0, poles.length - 1));

    const attach = poles[attachIndex]!;

    const branchLength = Math.floor(randomBetween(5, 15));

    let branchHeading = heading + randomBetween(-1.2, 1.2);

    let branchPrev = addPole(
      attach.lat + degreesPerMetreLat() * randomBetween(8, 15),
      attach.lon + degreesPerMetreLon(attach.lat) * randomBetween(8, 15),
      hasOfficialOrdering ? attach.poleId : "",
      ward,
    );

    for (let i = 1; i < branchLength; i++) {
      branchHeading += randomBetween(-0.4, 0.4);

      const distance = randomBetween(25, 40);

      const lat = branchPrev.lat + degreesPerMetreLat() * Math.sin(branchHeading) * distance;

      const lon = branchPrev.lon + degreesPerMetreLon(branchPrev.lat) * Math.cos(branchHeading) * distance;

      branchPrev = addPole(lat, lon, hasOfficialOrdering ? branchPrev.poleId : "", ward);
    }
  }

  return {
    dtId,
    feederId: feeder.id,
    lat: dtLat,
    lon: dtLon,
    poles,
  };
}

export function buildCsvs(): { polesCsv: string; transformersCsv: string } {
  const transformerRows: string[] = [
    "dt_id,feeder_id,lat,lon,capacity_kva,households_served",
  ];

  const poleRows: string[] = [
    "pole_id,lat,lon,feeder_id,dt_id,seq_on_line,parent_pole_id,pole_type,ward,pincode,device_id",
  ];

  for (let f = 0; f < FEEDERS.length; f++) {
    for (let t = 0; t < TRANSFORMERS_PER_FEEDER; t++) {
      const transformer = generateTransformer(f, f * TRANSFORMERS_PER_FEEDER + t);

      transformerRows.push(
        [
          transformer.dtId,
          transformer.feederId,
          transformer.lat.toFixed(6),
          transformer.lon.toFixed(6),
          "250",
          String(Math.floor(randomBetween(150, 320))),
        ].join(","),
      );

      for (const pole of transformer.poles) {
        poleRows.push(
          [
            pole.poleId,
            pole.lat.toFixed(6),
            pole.lon.toFixed(6),
            transformer.feederId,
            transformer.dtId,
            pole.seqOnLine === null ? "" : String(pole.seqOnLine),
            pole.parentPoleId,
            "LT-9m-PCC",
            pole.ward,
            pole.pin,
            pole.deviceId ?? "",
          ].join(","),
        );
      }
    }
  }

  return {
    polesCsv: poleRows.join("\n"),
    transformersCsv: transformerRows.join("\n"),
  };
}
