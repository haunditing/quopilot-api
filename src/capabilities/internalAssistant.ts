import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_SUPER_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "internalAssistant",
    code: "internalAssistant.viewMessages",
    domain: "SUPER_ADMIN",
    allowedRoles: ROLES_SUPER_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Ver historial del asistente interno",
    description: "Historial de la conversación con el asistente IA interno para super admins.",
    kind: "IA",
    dependencies: [],
  },
  {
    module: "internalAssistant",
    code: "internalAssistant.chat",
    domain: "SUPER_ADMIN",
    allowedRoles: ROLES_SUPER_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Conversar con asistente interno",
    description: "Enviar consultas al asistente IA interno (gestión de tenants, políticas y operación).",
    kind: "IA",
    dependencies: [
      { code: "internalAssistant.viewMessages", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "internalAssistant",
    code: "internalAssistant.reset",
    domain: "SUPER_ADMIN",
    allowedRoles: ROLES_SUPER_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Reiniciar asistente interno",
    description: "Reiniciar la conversación con el asistente IA interno.",
    kind: "IA",
    dependencies: [
      { code: "internalAssistant.chat", type: "OBLIGATORIA" },
    ],
  },
]);
