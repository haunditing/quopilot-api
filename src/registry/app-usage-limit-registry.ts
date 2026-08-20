export interface IAppUsageLimitDTO {
  code: string;
  name: string;
  description: string;
  unit: string;
  defaultValue: number;
  isActive: boolean;
  sortOrder: number;
}

export const APP_USAGE_LIMITS_REGISTRY: IAppUsageLimitDTO[] = [
  {
    code: "customers.max",
    name: "Límite de clientes",
    description: "Número máximo de clientes activos que el tenant puede registrar.",
    unit: "clientes",
    defaultValue: -1,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: "products.max",
    name: "Límite de productos",
    description: "Número máximo de productos y servicios en el catálogo.",
    unit: "productos",
    defaultValue: -1,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: "quotes.maxMonthly",
    name: "Cotizaciones por mes",
    description: "Número máximo de cotizaciones que se pueden emitir por mes calendario.",
    unit: "cotizaciones/mes",
    defaultValue: -1,
    isActive: true,
    sortOrder: 3,
  },
  {
    code: "sales.maxMonthly",
    name: "Ventas confirmadas por mes",
    description: "Número máximo de ventas registradas por mes calendario.",
    unit: "ventas/mes",
    defaultValue: -1,
    isActive: true,
    sortOrder: 4,
  },
  {
    code: "agents.maxActive",
    name: "Agentes activos máximos",
    description: "Número máximo de usuarios con rol de agente activos en el tenant.",
    unit: "agentes",
    defaultValue: -1,
    isActive: true,
    sortOrder: 5,
  },
  {
    code: "channels.max",
    name: "Canales de comunicación máximos",
    description: "Número máximo de canales de comunicación (WhatsApp, Web Chat) configurables.",
    unit: "canales",
    defaultValue: -1,
    isActive: true,
    sortOrder: 6,
  },
  {
    code: "ai.queriesMonthly",
    name: "Consultas de IA por mes",
    description: "Número máximo de interacciones y consultas con agentes de IA por mes.",
    unit: "consultas/mes",
    defaultValue: -1,
    isActive: true,
    sortOrder: 7,
  },
];
