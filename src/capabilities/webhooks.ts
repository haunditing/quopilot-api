import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "webhooks",
    code: "webhooks.verify",
    name: "Verificación de webhook",
    description:
      "Handshake de verificación entrante de proveedores de mensajería por canal.",
    kind: "SEGURIDAD",
    dependencies: [],
  },
  {
    module: "webhooks",
    code: "webhooks.receive",
    name: "Recepción de eventos de canal",
    description:
      "Recepción y procesamiento de mensajes/eventos entrantes de los canales conectados.",
    kind: "COMUNICACION",
    dependencies: [{ code: "webhooks.verify", type: "OPCIONAL" }],
  },
]);
