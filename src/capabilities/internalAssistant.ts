import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "internalAssistant",
    code: "internalAssistant.viewMessages",
    name: "Ver historial del asistente interno",
    description:
      "Historial de la conversación con el asistente IA interno para super admins.",
    kind: "IA",
    dependencies: [],
  },
  {
    module: "internalAssistant",
    code: "internalAssistant.chat",
    name: "Conversar con asistente interno",
    description:
      "Enviar consultas al asistente IA interno (gestión de tenants, políticas y operación).",
    kind: "IA",
    dependencies: [{ code: "internalAssistant.viewMessages", type: "OBLIGATORIA" }],
  },
  {
    module: "internalAssistant",
    code: "internalAssistant.reset",
    name: "Reiniciar asistente interno",
    description: "Reiniciar la conversación con el asistente IA interno.",
    kind: "IA",
    dependencies: [{ code: "internalAssistant.chat", type: "OBLIGATORIA" }],
  },
]);
