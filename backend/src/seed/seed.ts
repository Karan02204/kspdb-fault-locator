import { prisma } from "../lib/prisma.js";
import { NetworkService } from "../modules/network/services/network.service.js";
import { buildCsvs } from "./generator.js";

/**
 * Startup seeder (Gate G3: "the app is seeded on startup with a usable
 * synthetic network, so a reviewer sees a working system immediately").
 *
 * The CSVs are fed through the SAME import path a reviewer would use, so
 * the seed cannot drift from the import behaviour.
 *
 * Idempotent: if the database already contains poles it does nothing.
 */
async function seed() {
  const existingPoles = await prisma.pole.count();

  if (existingPoles > 0) {
    console.log(
      `Seed skipped: database already contains ${existingPoles} poles.`,
    );
    return { skipped: true };
  }

  const { polesCsv, transformersCsv } = buildCsvs();

  const networkService = new NetworkService();

  const result = await networkService.importNetwork(
    Buffer.from(polesCsv, "utf-8"),
    Buffer.from(transformersCsv, "utf-8"),
  );

  console.log("Seed complete:", result);

  return result;
}

seed()
  .then((result) => {
    if (result && "skipped" in result) {
      process.exit(0);
    }
    console.log("Synthetic network seeded successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
