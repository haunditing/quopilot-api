import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_ANY_TENANT_USER,
} from "./presets.js";

registerCapabilities([
  {
    module: "dashboard",
    code: "dashboard.view",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_ANY_TENANT_USER,
    includedInPlans: ALL_PLANS,
    name: "Ver dashboard principal",
    description: "Resumen operativo del tenant (cotizaciones, ventas, conversaciones y métricas clave).",
    kind: "ANALISIS",
    dependencies: [],
  },
]);
