import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_COMMERCIAL,
} from "./presets.js";

registerCapabilities([
  {
    module: "conversations",
    code: "conversations.view",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Bandeja de conversaciones",
    description: "Lista/pagina las conversaciones de los canales del tenant.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "conversations",
    code: "conversations.messages",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Ver mensajes de conversación",
    description: "Historial de mensajes e indicador de escritura de una conversación.",
    kind: "VISUALIZACION",
    dependencies: [
      { code: "conversations.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "conversations",
    code: "conversations.reply",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
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
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Tomar conversación",
    description: "Reclamar/asignarse una conversación para atención humana.",
    kind: "OPERACION_COMERCIAL",
    dependencies: [
      { code: "conversations.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "conversations",
    code: "conversations.reopen",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Reabrir conversación",
    description: "Reabrir una conversación cerrada o resuelta.",
    kind: "CAMBIO_ESTADO",
    dependencies: [
      { code: "conversations.view", type: "OBLIGATORIA" },
    ],
  },
]);
