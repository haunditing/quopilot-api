import "dotenv/config";
import mongoose from "mongoose";
import { Banner } from "../src/models/Banner.js";
import env from "../src/config/env.js";

/**
 * Seed de banners (SDUI). Inserta la configuración inicial si no existe.
 * Uso: `npm run seed:banners`
 */
const SEED = [
  {
    slot: "dashboard_top",
    type: "AlertBanner",
    priority: 100,
    conditions: [{ field: "plan", op: "eq", value: "FREE" }],
    props: {
      variant: "info",
      title: "Modo Free",
      message: "Estás en el plan gratuito. Mejora a PRO para desbloquear agentes autónomos.",
      ctaText: "Conocer planes",
      ctaUrl: "/settings/plans",
    },
  },
  {
    slot: "checkout_modal",
    type: "ModalNotice",
    priority: 200,
    conditions: [{ field: "paymentStatus", op: "eq", value: "failed" }],
    props: {
      title: "Error en el pago",
      message: "No pudimos procesar tu pago. Revisa tu método de pago e inténtalo de nuevo.",
      ctaText: "Reintentar",
      ctaUrl: "/checkout/retry",
    },
  },
  {
    slot: "header_global",
    type: "InlineNotice",
    priority: 50,
    conditions: [],
    props: { message: "🎉 Promoción: 20% en el primer mes con el código QUOP20" },
  },
];

async function seed(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  try {
    for (const banner of SEED) {
      const exists = await Banner.findOne({ slot: banner.slot, type: banner.type });
      if (!exists) {
        await Banner.create({ ...banner, active: true });
        console.log(`Banner ${banner.slot}/${banner.type} creado.`);
      } else {
        console.log(`Banner ${banner.slot}/${banner.type} ya existe.`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Seed de banners fallido:", error);
  process.exit(1);
});
