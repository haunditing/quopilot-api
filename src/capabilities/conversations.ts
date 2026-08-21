import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "conversations",
    code: "conversations.view",
    name: "Bandeja de conversaciones",
    description: "Lista/pagina las conversaciones de los canales del tenant.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "conversations",
    code: "conversations.messages",
    name: "Ver mensajes de conversación",
    description: "Historial de mensajes e indicador de escritura de una conversación.",
    kind: "VISUALIZACION",
    dependencies: [{ code: "conversations.view", type: "OBLIGATORIA" }],
  },
  {
    module: "conversations",
    code: "conversations.reply",
    name: "Responder conversación",
    description: "Enviar mensajes al cliente y notificar escritura en una conversación.",
    kind: "COMUNICACION",
    dependencies: [
      { code: "conversations.messages", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "conversations",
    code: "conversations.claim",
    name: "Tomar conversación",
    description: "Reclamar/asignarse una conversación para atención humana.",
    kind: "OPERACION_COMERCIAL",
    dependencies: [{ code: "conversations.view", type: "OBLIGATORIA" }],
  },
  {
    module: "conversations",
    code: "conversations.reopen",
    name: "Reabrir conversación",
    description: "Reabrir una conversación cerrada o resuelta.",
    kind: "CAMBIO_ESTADO",
    dependencies: [{ code: "conversations.view", type: "OBLIGATORIA" }],
  },
]);
