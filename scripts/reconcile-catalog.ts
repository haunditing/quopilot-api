/**
 * Reconcile Catalog CLI
 *
 * Reconcilia el catálogo (features, capacidades, herramientas IA y límites
 * de uso) contra su fuente en código. Por defecto ejecuta en modo dry run
 * (solo previsualiza el diff); usa --apply para escribir en la base de datos.
 *
 * Usage:
 *   npx tsx scripts/reconcile-catalog.ts           # dry run
 *   npx tsx scripts/reconcile-catalog.ts --apply   # aplica cambios
 */

import "dotenv/config";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import { connectToDatabase } from "../src/database/mongodb.js";
import { syncCatalogManually } from "../src/services/feature-sync-service.js";

async function main(): Promise<void> {
  await connectToDatabase();

  // Cargar la app activa los registros declarativos (rutas + herramientas IA),
  // igual que en runtime. Sin esto el registro en memoria estaría vacío.
  await import("../src/app.js");

  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  const result = await syncCatalogManually({ dryRun });

  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY RUN",
        features: result.features,
        capabilities: result.capabilities,
        tools: result.tools,
        usageLimits: result.usageLimits,
        pruning: result.pruning,
        integrity: {
          valid: result.integrity.valid,
          errors: result.integrity.errors.length,
          warnings: result.integrity.warnings.length,
        },
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("\nDry run: no se escribió nada. Usa --apply para aplicar.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Error reconciling catalog:", error);
  process.exit(1);
});
