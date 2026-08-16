import type { AgentChatMessage } from "../llm-service.js";

/**
 * Capas de contexto del agente.
 * - ALWAYS: información que SIEMPRE entra al prompt (pequeña, 1 documento).
 * - ON_DEMAND: se consulta solo cuando el mensaje del usuario lo amerita.
 * - SHORT_TERM: memoria corta (mensajes recientes de la conversación actual).
 * - LONG_TERM: memoria larga (resumen de conversación + agregados del cliente).
 */
export type ContextLayer = "ALWAYS" | "ON_DEMAND" | "SHORT_TERM" | "LONG_TERM";

export type ContextSource =
  | "tenant"
  | "agent-config"
  | "customer"
  | "conversation"
  | "policy"
  | "conversation-summary"
  | "customer-history"
  | "relevant-products"
  | "relevant-quotes"
  | "relevant-sales"
  | "recent-messages";

export type ContextTrigger =
  | "PRODUCT"
  | "QUOTE"
  | "SALE"
  | "CUSTOMER_HISTORY";

export interface ContextSourceConfig {
  label: string;
  /** 1 = máxima prioridad. Determina quién sobrevive a la truncación. */
  priority: number;
  layer: ContextLayer;
  /**
   * Proporción (0..1) del presupuesto del system prompt que se asigna a la
   * sección. Las secciones de mayor prioridad se llenan primero.
   */
  budgetWeight: number;
}

export const CONTEXT_SOURCES: Record<ContextSource, ContextSourceConfig> = {
  "agent-config": {
    label: "Configuración del agente",
    priority: 1,
    layer: "ALWAYS",
    budgetWeight: 0.24,
  },
  tenant: {
    label: "Empresa",
    priority: 2,
    layer: "ALWAYS",
    budgetWeight: 0.05,
  },
  customer: {
    label: "Cliente actual",
    priority: 3,
    layer: "ALWAYS",
    budgetWeight: 0.06,
  },
  conversation: {
    label: "Conversación",
    priority: 4,
    layer: "ALWAYS",
    budgetWeight: 0.03,
  },
  policy: {
    label: "Políticas comerciales",
    priority: 5,
    layer: "ALWAYS",
    budgetWeight: 0.12,
  },
  "conversation-summary": {
    label: "Resumen de la conversación",
    priority: 6,
    layer: "LONG_TERM",
    budgetWeight: 0.12,
  },
  "customer-history": {
    label: "Historial del cliente",
    priority: 7,
    layer: "LONG_TERM",
    budgetWeight: 0.08,
  },
  "relevant-products": {
    label: "Productos relevantes",
    priority: 8,
    layer: "ON_DEMAND",
    budgetWeight: 0.12,
  },
  "relevant-quotes": {
    label: "Cotizaciones relevantes",
    priority: 9,
    layer: "ON_DEMAND",
    budgetWeight: 0.1,
  },
  "relevant-sales": {
    label: "Ventas relevantes",
    priority: 10,
    layer: "ON_DEMAND",
    budgetWeight: 0.08,
  },
  "recent-messages": {
    label: "Mensajes recientes",
    priority: 11,
    layer: "SHORT_TERM",
    budgetWeight: 0,
  },
};

export const CONTEXT_LIMITS = {
  maxProducts: 8,
  maxQuotes: 5,
  maxSales: 5,
} as const;

export const CONTEXT_BUDGET_RATIOS = {
  /** Fracción del presupuesto total reservada a mensajes recientes (memoria corta). */
  recentMessages: 0.3,
  /** Fracción reservada al system prompt (resto de secciones). */
  systemPrompt: 0.7,
} as const;

export const MIN_CONTEXT_BUDGET = 1000;
export const MIN_SECTION_TOKENS = 20;

/**
 * Detecta qué fuentes "bajo demanda" conviene cargar según el mensaje actual.
 * Evita consultar toda la base de datos: solo se disparan los triggers.
 */
export function detectTriggers(message: string): ContextTrigger[] {
  const text = message.toLowerCase();
  const triggers = new Set<ContextTrigger>();

  if (
    /producto|precio|cu[aá]nto|cuesta|catalogo|cat[aá]logo|sku|disponible|tienes|venden|busco|necesito/i.test(
      text,
    )
  ) {
    triggers.add("PRODUCT");
  }

  if (/cotizacion|cotización|cotiza|presupuesto|preparar.*pedido/i.test(text)) {
    triggers.add("QUOTE");
  }

  if (
    /venta|compr(a|é|e) |pedido|factura|pagado|pag[aá]do|mi.*pedido/i.test(
      text,
    )
  ) {
    triggers.add("SALE");
  }

  if (
    /historial|anteriormente|antes.*compr|he comprado|compr[eé] antes|m[ií]s pedidos/i.test(
      text,
    )
  ) {
    triggers.add("CUSTOMER_HISTORY");
  }

  return [...triggers];
}

/* -------------------------------------------------------------------------- */
/* Perfiles que entran al contexto (siempre compactos, nunca documentos crudos) */
/* -------------------------------------------------------------------------- */

export interface AgentContextProfile {
  name?: string;
  description?: string;
  personality?: string;
  systemInstructions?: string;
  language?: string;
  tone?: string;
  commercialObjective?: string;
  welcomeMessage?: string;
  behaviorRules?: string[];
  productScope?: string;
  allowedProductIds?: string[];
  enabledTools?: string[];
  status?: string;
  escalation?: {
    enabled?: boolean;
    keywords?: string[];
  };
  memory?: {
    enabled?: boolean;
    messageWindow?: number;
    maxContextTokens?: number;
  };
}

export interface TenantContextProfile {
  name?: string;
  legalName?: string;
  currency?: string;
  country?: string;
  timezone?: string;
}

export interface CustomerContextProfile {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
}

export interface ConversationContextProfile {
  channel?: string;
  status?: string;
}

export interface CommercialPolicyProfile {
  paymentTerms?: string;
  discountPolicy?: string;
  shippingPolicy?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  notes?: string;
}

export interface ProductContextItem {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  currency: string;
  description?: string;
}

export interface QuoteContextItem {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface SaleContextItem {
  id: string;
  number: string;
  total: number;
  currency: string;
  soldAt: string;
}

export interface CustomerHistoryProfile {
  totalSales: number;
  totalSpent: number;
  lastPurchaseAt?: string;
  openQuotes: number;
}

export interface ContextSection {
  source: ContextSource;
  label: string;
  priority: number;
  layer: ContextLayer;
  content: string;
  tokens: number;
  truncated: boolean;
  included: boolean;
}

export interface ContextUsage {
  budget: number;
  systemTokens: number;
  messageTokens: number;
  totalTokens: number;
  sections: ContextSection[];
}

export interface BuiltAgentContext {
  systemPrompt: string;
  recentMessages: AgentChatMessage[];
  usage: ContextUsage;
}

export interface BuildAgentContextInput {
  tenantId: string;
  conversationId: string;
  customerId: string;
  /** Último mensaje entrante del cliente; dispara las fuentes bajo demanda. */
  userMessage: string;
  agent: AgentContextProfile;
  /** Si false, no se consultan fuentes bajo demanda. Por defecto true. */
  onDemand?: boolean;
}
