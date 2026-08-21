/**
 * Extract Capabilities (Declarative Registry)
 *
 * Loads the backend modules so each one registers its own capabilities
 * natively (src/capabilities/* and agent tools), then writes the
 * consolidated JSON report.
 *
 * No regex scanning, no frontend coupling.
 *
 * Usage: npx tsx scripts/extract-capabilities.ts
 */

import "dotenv/config";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  // Loading the app imports every route module; each route module and
  // agent tool registers its own capabilities on import.
  await import("../src/app.js");

  const { getCapabilitiesReport } = await import(
    "../src/capabilities/index.js"
  );

  const report = getCapabilitiesReport();
  const output = JSON.stringify(report, null, 2);

  const scriptsDir = path.join(__dirname);
  const outputPath = path.join(scriptsDir, "capabilities-report.json");

  await fs.writeFile(outputPath, output, "utf-8");

  console.log(`Capabilities report generated: ${outputPath}`);
  console.log(`Total capabilities registered: ${report.totalCapabilities}`);
}

main().catch((error) => {
  console.error("Error generating capabilities report:", error);
  process.exit(1);
});
