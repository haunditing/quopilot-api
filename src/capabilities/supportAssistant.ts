import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "supportAssistant",
    code: "supportAssistant.messages",
    name: "Mensajes de soporte IA",
    description:
      "Consultar y enviar mensajes al asistente de soporte con IA para usuarios del tenant.",
    kind: "IA",
    dependencies: [],
  },
  {
    module: "supportAssistant",
    code: "supportAssistant.reset",
    name: "Reiniciar conversación de soporte",
    description: "Reiniciar la conversación con el asistente de soporte.",
    kind: "IA",
    dependencies: [{ code: "supportAssistant.messages", type: "OBLIGATORIA" }],
  },
  {
    module: "supportAssistant",
    code: "supportAssistant.metrics",
    name: "Métricas de soporte",
    description: "Indicadores de uso y resolución del asistente de soporte.",
    kind: "ANALISIS",
    dependencies: [{ code: "supportAssistant.messages", type: "OBLIGATORIA" }],
  },
  {
    module: "supportAssistant",
    code: "supportAssistant.knowledge",
    name: "Base de conocimiento",
    description:
      "Administrar documentos de conocimiento (crear, editar, eliminar) usados por el asistente de soporte.",
    kind: "EDICION",
    dependencies: [{ code: "supportAssistant.messages", type: "OBLIGATORIA" }],
  },
  {
    module: "supportAssistant",
    code: "supportAssistant.cases",
    name: "Casos de soporte",
    description:
      "Gestionar casos generados por el asistente (listar, crear, actualizar, confirmar, eliminar).",
    kind: "EDICION",
    dependencies: [{ code: "supportAssistant.messages", type: "OBLIGATORIA" }],
  },
]);
