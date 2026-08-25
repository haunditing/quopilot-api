import "dotenv/config";
import mongoose from "mongoose";
import { ShowcaseImage } from "../src/models/ShowcaseImage.js";
import env from "../src/config/env.js";

/**
 * Seed de imágenes del showcase (las que muestra la landing en el Hero).
 * Uso: `npm run seed:showcase`
 */
const INITIAL = [
  {
    title: "Dashboard comercial",
    description:
      "Ventas, cotizaciones y clientes activos en un solo tablero, con métricas en tiempo real.",
    imageUrl: "https://cdn.quopilot.com/showcase/dashboard.png",
    order: 1,
  },
  {
    title: "Cotizaciones con IA",
    description:
      "Crea y envía cotizaciones al instante; la IA redacta y calcula totales por ti.",
    imageUrl: "https://cdn.quopilot.com/showcase/quotes.png",
    order: 2,
  },
  {
    title: "Asistente de ventas IA",
    description:
      "Un agente que atiende clientes 24/7 y responde con tu información real de negocio.",
    imageUrl: "https://cdn.quopilot.com/showcase/agent.png",
    order: 3,
  },
];

async function seed(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  try {
    for (const item of INITIAL) {
      const exists = await ShowcaseImage.findOne({ title: item.title });
      if (!exists) {
        await ShowcaseImage.create({ ...item, active: true });
        console.log(`Showcase "${item.title}" creado.`);
      } else {
        console.log(`Showcase "${item.title}" ya existe.`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Seed de showcase fallido:", error);
  process.exit(1);
});
