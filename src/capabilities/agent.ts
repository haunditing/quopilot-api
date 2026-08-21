import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "agent",
    code: "agent.configure",
    name: "Configurar agente IA",
    description: "Ver y editar la configuración del agente IA (personalidad, catálogo, herramientas).",
    kind: "EDICION",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.chat",
    name: "Chat de agente (bandeja IA)",
    description: "Gestionar conversaciones atendidas por el agente IA desde la bandeja interna.",
    kind: "IA",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.assistant",
    name: "Asistente interno del agente",
    description:
      "Asistente IA de apoyo para administradores dentro del módulo de agente (consultas y acciones guiadas).",
    kind: "IA",
    dependencies: [{ code: "agent.chat", type: "OBLIGATORIA" }],
  },
  {
    module: "agent",
    code: "agent.dashboard",
    name: "Dashboard del agente",
    description:
      "Resumen operativo para el rol agente (sus conversaciones y desempeño).",
    kind: "ANALISIS",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.publicChat",
    name: "Chat público con clientes",
    description:
      "Chat web público: clientes inician conversaciones, reciben y envían mensajes, y cierran el chat.",
    kind: "COMUNICACION",
    dependencies: [{ code: "channels.view", type: "OPCIONAL" }],
  },
]);
