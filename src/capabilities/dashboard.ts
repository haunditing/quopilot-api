import { registerCapability } from "./registry.js";

registerCapability({
  module: "dashboard",
  code: "dashboard.view",
  name: "Ver dashboard principal",
  description:
    "Resumen operativo del tenant (cotizaciones, ventas, conversaciones y métricas clave).",
  kind: "ANALISIS",
  dependencies: [],
});
