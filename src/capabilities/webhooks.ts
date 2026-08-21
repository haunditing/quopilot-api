import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_TENANT_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "webhooks",
    code: "webhooks.verify",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Verificación de webhook",
    description: "Handshake de verificación entrante de proveedores de mensajería por canal.",
    kind: "SEGURIDAD",
    dependencies: [],
  },
  {
    module: "webhooks",
    code: "webhooks.receive",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Recepción de eventos de canal",
    description: "Recepción y procesamiento de mensajes/eventos entrantes de los canales conectados.",
    kind: "COMUNICACION",
    dependencies: [
      { code: "webhooks.verify", type: "OPCIONAL" },
    ],
  },
]);
