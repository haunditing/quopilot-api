import type {
  AIExecutionLevel,
  AIToolAction,
} from "../models/AIAssistantTool.js";

// Type auxiliar para asegurar consistencia en las llaves de herramientas
export type AIToolKey =
  | "tools_quotes"
  | "tools_sales"
  | "tools_products"
  | "tools_customers"
  | "tools_channels"
  | "tools_cases"
  | "tools_knowledge"
  | "tools_dashboard"
  | "tools_agent"
  | "tools_settings"
  | "tools_reports"
  | "tools_integrations";

// Tipo DTO para el catálogo de herramientas IA (POJO de entrada)
export interface IAIAssistantToolDTO {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultExecutionLevel: AIExecutionLevel;
  availableActions: AIToolAction[];
  requiresConfirmation: boolean;
  isActive: boolean;
  sortOrder: number;
}

export const AI_TOOLS_REGISTRY: IAIAssistantToolDTO[] = [
  {
    key: "tools_quotes",
    label: "Cotizaciones",
    description: "Crear, consultar y gestionar cotizaciones",
    category: "comercial",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    key: "tools_sales",
    label: "Ventas",
    description: "Gestión de ventas y pipeline",
    category: "comercial",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    key: "tools_products",
    label: "Productos",
    description: "Catálogo de productos y servicios",
    category: "catalogo",
    defaultExecutionLevel: "FULL_AUTOMATION",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    key: "tools_customers",
    label: "Clientes",
    description: "Gestión de clientes y contactos",
    category: "comercial",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    key: "tools_channels",
    label: "Canales",
    description: "Canales de comunicación (WhatsApp, Web Chat, etc.)",
    category: "canales",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 5,
  },
  {
    key: "tools_cases",
    label: "Casos de Soporte (CBR)",
    description: "Búsqueda y gestión de casos resueltos",
    category: "soporte",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 6,
  },
  {
    key: "tools_knowledge",
    label: "Base de Conocimiento",
    description: "Documentación y artículos de ayuda",
    category: "soporte",
    defaultExecutionLevel: "READ_ONLY",
    availableActions: ["consult", "explain"],
    requiresConfirmation: false,
    isActive: true,
    sortOrder: 7,
  },
  {
    key: "tools_dashboard",
    label: "Dashboard",
    description: "Métricas y KPIs del tenant",
    category: "analytics",
    defaultExecutionLevel: "READ_ONLY",
    availableActions: ["consult", "explain"],
    requiresConfirmation: false,
    isActive: true,
    sortOrder: 8,
  },
  {
    key: "tools_agent",
    label: "Agente Comercial",
    description: "Configuración del agente comercial",
    category: "ia",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 9,
  },
  {
    key: "tools_settings",
    label: "Configuración",
    description: "Configuración general del tenant",
    category: "configuracion",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 10,
  },
  {
    key: "tools_reports",
    label: "Reportes",
    description: "Reportes y analytics avanzados",
    category: "analytics",
    defaultExecutionLevel: "READ_ONLY",
    availableActions: ["consult", "explain"],
    requiresConfirmation: false,
    isActive: true,
    sortOrder: 11,
  },
  {
    key: "tools_integrations",
    label: "Integraciones",
    description: "API, webhooks e integraciones externas",
    category: "integraciones",
    defaultExecutionLevel: "ASSISTED_DRAFT",
    availableActions: ["consult", "explain", "create", "modify"],
    requiresConfirmation: true,
    isActive: true,
    sortOrder: 12,
  },
];

export interface AssistantCapability {
  toolKey: AIToolKey;
  allowedActions: AIToolAction[];
  executionLevel: AIExecutionLevel;
  requiresConfirmation: boolean;
}

export const DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN: Record<
  string,
  AssistantCapability[]
> = {
  FREE: [
    {
      toolKey: "tools_dashboard",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_knowledge",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
  ],
  STARTER: [
    {
      toolKey: "tools_dashboard",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_knowledge",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_quotes",
      allowedActions: ["consult", "explain", "create"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_products",
      allowedActions: ["consult", "explain", "create"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_customers",
      allowedActions: ["consult", "explain", "create"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
  ],
  PRO: [
    {
      toolKey: "tools_dashboard",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_knowledge",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_quotes",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_sales",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_products",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_customers",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_channels",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
  ],
  ENTERPRISE: [
    {
      toolKey: "tools_dashboard",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_knowledge",
      allowedActions: ["consult", "explain"],
      executionLevel: "READ_ONLY",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_quotes",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_sales",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_products",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: false,
    },
    {
      toolKey: "tools_customers",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_channels",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_agent",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_reports",
      allowedActions: ["consult", "explain"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_integrations",
      allowedActions: ["consult", "explain", "create", "modify"],
      executionLevel: "ASSISTED_DRAFT",
      requiresConfirmation: true,
    },
    {
      toolKey: "tools_settings",
      allowedActions: ["consult", "explain", "modify"],
      executionLevel: "FULL_AUTOMATION",
      requiresConfirmation: true,
    },
  ],
};
