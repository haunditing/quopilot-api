import "dotenv/config";
import mongoose from "mongoose";
import { Plan } from "../src/models/Plan.js";
import env from "../src/config/env.js";

/**
 * Migración: soporte de borrado lógico en la entidad Plan.
 *
 * - Setea `deletedAt` (default null) en planos existentes que no lo tengan.
 * - No altera `isActive`: los planes inactivos pero no archivados se conservan.
 *
 * Uso: `npm run migrate:plan-soft-delete`
 */
async function migrate(): Promise<void> {
  await mongoose.connect(env.mongodbUri);

  try {
    const result = await Plan.updateMany(
      { deletedAt: { $exists: false } },
      { $set: { deletedAt: null } },
    );

    console.log(
      `Migración completada. ${result.modifiedCount} plan(es) actualizado(s) con deletedAt=null.`,
    );

    const total = await Plan.countDocuments();
    const archived = await Plan.countDocuments({ deletedAt: { $ne: null } });
    console.log(`Total de planes: ${total}. Archivados: ${archived}.`);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  console.error("Migración fallida:", error);
  process.exit(1);
});
