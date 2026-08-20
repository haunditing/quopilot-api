export interface IAppFeatureDTO {
  key: string;
  label: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}

export const APP_FEATURES_REGISTRY: IAppFeatureDTO[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Panel principal de métricas y KPIs",
    category: "general",
    isActive: true,
    sortOrder: 1,
    metadata: {},
  },
  {
    key: "customers",
    label: "Clientes",
    description: "Gestión de clientes y contactos",
    category: "comercial",
    isActive: true,
    sortOrder: 2,
    metadata: {},
  },
  {
    key: "products",
    label: "Productos",
    description: "Catálogo de productos y servicios",
    category: "comercial",
    isActive: true,
    sortOrder: 3,
    metadata: {},
  },
  {
    key: "quotes",
    label: "Cotizaciones",
    description: "Creación y gestión de cotizaciones",
    category: "comercial",
    isActive: true,
    sortOrder: 4,
    metadata: {},
  },
  {
    key: "sales",
    label: "Ventas",
    description: "Pipeline y registro de ventas",
    category: "comercial",
    isActive: true,
    sortOrder: 5,
    metadata: {},
  },
  {
    key: "channels",
    label: "Canales",
    description: "Canales de comunicación (WhatsApp, Web Chat, etc.)",
    category: "canales",
    isActive: true,
    sortOrder: 6,
    metadata: {},
  },
  {
    key: "agent",
    label: "Agente IA",
    description: "Configuración del agente comercial",
    category: "ia",
    isActive: true,
    sortOrder: 7,
    metadata: {},
  },
  {
    key: "reports",
    label: "Reportes",
    description: "Reportes y analytics",
    category: "analytics",
    isActive: true,
    sortOrder: 8,
    metadata: {},
  },
  {
    key: "integrations",
    label: "Integraciones",
    description: "API, webhooks e integraciones externas",
    category: "integraciones",
    isActive: true,
    sortOrder: 9,
    metadata: {},
  },
  {
    key: "settings",
    label: "Configuración",
    description: "Configuración general del tenant",
    category: "configuracion",
    isActive: true,
    sortOrder: 10,
    metadata: {},
  },
];

export const DEFAULT_APP_FEATURES_BY_PLAN: Record<string, string[]> = {
  FREE: ["dashboard", "customers", "products", "quotes", "settings"],
  STARTER: [
    "dashboard",
    "customers",
    "products",
    "quotes",
    "sales",
    "channels",
    "agent",
    "reports",
    "settings",
  ],
  PRO: [
    "dashboard",
    "customers",
    "products",
    "quotes",
    "sales",
    "channels",
    "agent",
    "reports",
    "integrations",
    "settings",
  ],
  ENTERPRISE: [
    "dashboard",
    "customers",
    "products",
    "quotes",
    "sales",
    "channels",
    "agent",
    "reports",
    "integrations",
    "settings",
  ],
};