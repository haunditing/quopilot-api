import { getRecentMessages } from "../agent-memory-service.js";
import env from "../../config/env.js";
import { estimateTokens, truncateToTokens } from "./tokenizer.js";
import {
  extractProductSearch,
  loadAlwaysOnData,
  loadCustomerHistory,
  loadOnDemandData,
} from "./loaders.js";
import {
  serializeAgent,
  serializeConversation,
  serializeCustomer,
  serializeCustomerHistory,
  serializePolicy,
  serializeProducts,
  serializeQuotes,
  serializeSales,
  serializeSummary,
  serializeTenant,
} from "./serializer.js";
import {
  CONTEXT_BUDGET_RATIOS,
  CONTEXT_SOURCES,
  MIN_CONTEXT_BUDGET,
  MIN_SECTION_TOKENS,
  detectTriggers,
  type AgentContextProfile,
  type BuildAgentContextInput,
  type BuiltAgentContext,
  type ContextSection,
  type ContextSource,
  type ContextTrigger,
} from "./types.js";

type SystemContextSource = Exclude<
  ContextSource,
  "recent-messages"
>;

const SYSTEM_SOURCE_ORDER: SystemContextSource[] = [
  "agent-config",
  "tenant",
  "customer",
  "conversation",
  "policy",
  "conversation-summary",
  "customer-history",
  "relevant-products",
  "relevant-quotes",
  "relevant-sales",
];

export function resolveContextBudget(
  agent: AgentContextProfile,
): number {
  const configured = agent.memory?.maxContextTokens;

  if (configured && configured >= MIN_CONTEXT_BUDGET) {
    return configured;
  }

  return Math.max(MIN_CONTEXT_BUDGET, env.agentContextBudget);
}

export function resolveMessageWindow(agent: AgentContextProfile): number {
  return agent.memory?.messageWindow ?? env.agentMemoryWindow;
}

/**
 * Construye el contexto dinámico del agente para un turno de conversación.
 *
 * 1. ALWAYS:  tenant, config del agente, cliente actual, conversación, políticas,
 *             resumen de conversación (memoria larga) — documentos únicos, siempre.
 * 2. ON_DEMAND: productos / cotizaciones / ventas relevantes + historial agregado,
 *               solo si el mensaje del usuario dispara el trigger.
 * 3. SHORT_TERM: mensajes recientes de la conversación (memoria corta).
 * 4. LONG_TERM: resumen de conversación + agregados del historial del cliente.
 * 5. Límites: presupuesto de tokens del system prompt (70%) y de mensajes (30%);
 *             cada sección se trunca dentro de su porción.
 * 6. Prioridad: las secciones se ensamblan por prioridad (1 = mayor) y una
 *             sección de baja prioridad nunca le quita presupuesto a una alta.
 */
export async function buildAgentContext(
  input: BuildAgentContextInput,
): Promise<BuiltAgentContext> {
  const {
    tenantId,
    conversationId,
    customerId,
    userMessage,
    agent,
    onDemand = true,
  } = input;

  const budget = resolveContextBudget(agent);

  const messageBudget = Math.max(
    200,
    Math.floor(budget * CONTEXT_BUDGET_RATIOS.recentMessages),
  );
  const systemBudget = Math.max(
    200,
    budget - messageBudget,
  );

  const [alwaysOn, triggers] = await Promise.all([
    loadAlwaysOnData(tenantId, conversationId, customerId),
    onDemand ? detectTriggers(userMessage) : Promise.resolve<ContextTrigger[]>([]),
  ]);

  const search = triggers.includes("PRODUCT")
    ? extractProductSearch(userMessage)
    : undefined;

  const onDemandData =
    triggers.length > 0
      ? await loadOnDemandData({
          tenantId,
          customerId,
          agent,
          triggers,
          search,
        })
      : null;

  const history =
    triggers.includes("SALE") || triggers.includes("CUSTOMER_HISTORY")
      ? await loadCustomerHistory(tenantId, customerId)
      : null;

  const rawBySource: Record<SystemContextSource, string> = {
    "agent-config": serializeAgent(agent),
    tenant: alwaysOn.tenant ? serializeTenant(alwaysOn.tenant) : "",
    customer: alwaysOn.customer ? serializeCustomer(alwaysOn.customer) : "",
    conversation: alwaysOn.conversation
      ? serializeConversation(alwaysOn.conversation)
      : "",
    policy: alwaysOn.policy ? serializePolicy(alwaysOn.policy) : "",
    "conversation-summary": alwaysOn.summary.trim()
      ? serializeSummary(alwaysOn.summary.trim())
      : "",
    "customer-history": history ? serializeCustomerHistory(history) : "",
    "relevant-products": onDemandData?.products.length
      ? serializeProducts(onDemandData.products)
      : "",
    "relevant-quotes": onDemandData?.quotes.length
      ? serializeQuotes(onDemandData.quotes)
      : "",
    "relevant-sales": onDemandData?.sales.length
      ? serializeSales(onDemandData.sales)
      : "",
  };

  const sections: ContextSection[] = [];

  let remaining = systemBudget;

  for (const source of SYSTEM_SOURCE_ORDER) {
    if (remaining <= 0) {
      break;
    }

    const raw = rawBySource[source];

    if (!raw.trim()) {
      continue;
    }

    const config = CONTEXT_SOURCES[source];
    const slice = Math.max(
      1,
      Math.floor(systemBudget * config.budgetWeight),
    );
    const cap = Math.min(slice, remaining);

    if (cap < MIN_SECTION_TOKENS) {
      continue;
    }

    const { text, truncated } = truncateToTokens(raw, cap);
    const tokens = estimateTokens(text);

    remaining -= tokens;

    sections.push({
      source,
      label: config.label,
      priority: config.priority,
      layer: config.layer,
      content: text,
      tokens,
      truncated,
      included: tokens > 0,
    });
  }

  const systemPrompt = sections
    .filter((section) => section.included)
    .map((section) => section.content)
    .join("\n\n");

  const window = resolveMessageWindow(agent);

  const recent = await getRecentMessages(tenantId, conversationId, window);

  const recentMessages = truncateMessages(recent, messageBudget);

  const messageTokens = recentMessages.reduce(
    (total, message) => total + estimateTokens(message.content),
    0,
  );

  const systemTokens = sections
    .filter((section) => section.included)
    .reduce((total, section) => total + section.tokens, 0);

  return {
    systemPrompt,
    recentMessages,
    usage: {
      budget,
      systemTokens,
      messageTokens,
      totalTokens: systemTokens + messageTokens,
      sections,
    },
  };
}

function truncateMessages(
  messages: BuiltAgentContext["recentMessages"],
  maxTokens: number,
): BuiltAgentContext["recentMessages"] {
  const result: BuiltAgentContext["recentMessages"] = [];

  let used = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message === undefined) {
      continue;
    }

    const tokens = estimateTokens(message.content);

    if (used + tokens > maxTokens) {
      if (result.length === 0) {
        const { text } = truncateToTokens(message.content, maxTokens);

        if (text) {
          result.unshift({
            ...message,
            content: text,
          });
        }
      }

      break;
    }

    used += tokens;
    result.unshift(message);
  }

  return result;
}
