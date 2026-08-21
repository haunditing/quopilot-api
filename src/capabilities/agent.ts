import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  PLANS_PRO_UP,
  ROLES_COMMERCIAL,
  ROLES_TENANT_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "agent",
    code: "agent.configure",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: PLANS_PRO_UP,
    name: "Configurar agente IA",
    description: "Ver y editar la configuración del agente IA (personalidad, catálogo, herramientas).",
    kind: "EDICION",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.chat",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: PLANS_PRO_UP,
    name: "Chat de agente (bandeja IA)",
    description: "Gestionar conversaciones atendidas por el agente IA desde la bandeja interna.",
    kind: "IA",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.assistant",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: PLANS_PRO_UP,
    name: "Asistente interno del agente",
    description: "Asistente IA de apoyo para administradores dentro del módulo de agente.",
    kind: "IA",
    dependencies: [
      { code: "agent.chat", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "agent",
    code: "agent.dashboard",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Dashboard del agente",
    description: "Resumen operativo para el rol agente (sus conversaciones y desempeño).",
    kind: "ANALISIS",
    dependencies: [],
  },
  {
    module: "agent",
    code: "agent.publicChat",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: PLANS_PRO_UP,
    name: "Chat público con clientes",
    description: "Chat web público: clientes inician conversaciones, reciben y envían mensajes.",
    kind: "COMUNICACION",
    dependencies: [
      { code: "channels.view", type: "OPCIONAL" },
    ],
  },
]);
