import {
  getAgentByTenant,
  provisionAgent,
  updateAgent,
} from "./agent-service.js";
import { getProducts } from "./product-query-service.js";
import {
  createLLMService,
  type AgentChatMessage,
  type AgentLLMResult,
  type AgentLLMService,
} from "./llm-service.js";
import { updateAgentSchema } from "../schemas/agent-schema.js";
import {
  registerAssistant,
  type AssistantContext,
  type AssistantDefinition,
  type AssistantToolResult,
} from "./assistant-engine.js";

export const AGENT_CONFIG_ASSISTANT_ID = "agent-config";

interface AgentConfigLike {
  name?: string;
  description?: string;
  personality?: string;
  language?: string;
  tone?: string;
  status?: string;
  welcomeMessage?: string;
  behaviorRules?: string[];
  enabledTools?: string[];
  productScope?: string;
  allowedProductIds?: string[];
  escalation?: {
    enabled?: boolean;
    keywords?: string[];
  };
  memory?: {
    enabled?: boolean;
    messageWindow?: number;
    maxContextTokens?: number;
  };
  llm?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };
}

const ALL_TOOLS = [
  "PRODUCT_SEARCH",
  "PRODUCT_DETAILS",
  "CUSTOMER_LOOKUP",
  "CUSTOMER_UPDATE",
  "CUSTOMER_HISTORY",
  "QUOTE_HISTORY",
  "QUOTE_DETAILS",
  "QUOTE_DRAFT",
  "QUOTE_UPDATE",
  "SALES_HISTORY",
  "HUMAN_HANDOFF",
] as const;

const TOOL_PHRASES: Array<[string, string[]]> = [
  ["PRODUCT_SEARCH", ["busqueda de productos", "búsqueda de productos", "buscar productos", "buscador de productos"]],
  ["PRODUCT_DETAILS", ["detalles de producto", "detalle de producto", "ficha de producto"]],
  ["CUSTOMER_LOOKUP", ["identificar cliente", "busqueda de cliente", "búsqueda de cliente", "buscar cliente"]],
  ["CUSTOMER_UPDATE", ["actualizar datos del cliente", "actualizar cliente", "editar datos del cliente"]],
  ["CUSTOMER_HISTORY", ["historial del cliente", "historial de cliente", "historial de compras"]],
  ["QUOTE_HISTORY", ["historial de cotizaciones", "historial de cotizacion", "cotizaciones previas", "consultar cotizaciones"]],
  ["QUOTE_DETAILS", ["estado de cotizacion", "estado de la cotizacion", "estado de la cotización"]],
  ["QUOTE_DRAFT", ["crear cotizacion", "elaborar cotizacion", "crear cotización", "elaborar cotización", "preparar cotizacion"]],
  ["QUOTE_UPDATE", ["modificar cotizacion", "editar cotizacion", "modificar la cotizacion"]],
  ["SALES_HISTORY", ["historial de ventas", "consultar ventas"]],
  ["HUMAN_HANDOFF", ["transferir a humano", "transferir a asesor", "derivar a humano", "transferencia a humano"]],
];

const TONE_LABELS: Record<string, string> = {
  PROFESSIONAL: "Profesional",
  FRIENDLY: "Amigable",
  FORMAL: "Formal",
  CASUAL: "Casual",
  EMPATHETIC: "Empático",
};

const TONE_VALUES: Record<string, string> = {
  profesional: "PROFESSIONAL",
  amigable: "FRIENDLY",
  formal: "FORMAL",
  casual: "CASUAL",
  empatico: "EMPATHETIC",
  "empático": "EMPATHETIC",
};

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
};

const LANGUAGE_VALUES: Record<string, string> = {
  ingles: "en",
  inglés: "en",
  espanol: "es",
  español: "es",
  portugues: "pt",
  portugués: "pt",
  frances: "fr",
  francés: "fr",
};

function describeConfig(config: AgentConfigLike): string {
  const tools = config.enabledTools?.length
    ? config.enabledTools.join(", ")
    : "Todas";

  const scope =
    config.productScope === "SELECTED"
      ? `Solo productos seleccionados (${config.allowedProductIds?.length ?? 0})`
      : "Todos los productos";

  const escalation = config.escalation?.enabled
    ? `Sí${config.escalation?.keywords?.length ? ` (${config.escalation.keywords.join(", ")})` : ""}`
    : "No";

  const memory = config.memory?.enabled
    ? `Sí (ventana ${config.memory?.messageWindow ?? 30})`
    : "No";

  const llm = config.llm?.apiKey
    ? config.llm.model || "Configurado"
    : "Sin configurar (modo demo sin conexión)";

  return [
    "Configuración actual del agente:",
    `- Nombre: ${config.name ?? "—"}`,
    `- Descripción: ${config.description || "—"}`,
    `- Tono: ${TONE_LABELS[config.tone ?? ""] ?? "—"}`,
    `- Idioma: ${LANGUAGE_LABELS[config.language ?? ""] ?? "—"}`,
    `- Estado: ${config.status === "ACTIVE" ? "Activo" : "Inactivo"}`,
    `- Mensaje de bienvenida: ${config.welcomeMessage || "—"}`,
    `- Herramientas: ${tools}`,
    `- Catálogo: ${scope}`,
    `- Reglas de comportamiento: ${config.behaviorRules?.length ?? 0}`,
    `- Escalación: ${escalation}`,
    `- Memoria: ${memory}`,
    `- Modelo de IA: ${llm}`,
    "",
    "Puedes pedirme cambios: nombre, descripción, tono, idioma, estado, mensaje de bienvenida, herramientas, reglas de comportamiento, catálogo o la API Key del modelo.",
  ].join("\n");
}

function buildUpdateIntent(
  raw: string,
  config?: AgentConfigLike,
): Record<string, unknown> | null {
  const message = raw.trim();
  const lower = message.toLowerCase();

  const nameMatch = message.match(
    /nombre\s+(?:del\s+agente\s+)?(?:a\s+|por\s+|como\s+|de\s+|:)?\s*["“]?([^"”\n]+)["”]?$/i,
  );

  if (nameMatch && nameMatch[1].trim()) {
    return {
      name: nameMatch[1].trim(),
    };
  }

  const toneMatch = message.match(
    /tono\s+(?:a\s+|a\s+un\s+|hacia\s+|m[aá]s\s+)?(profesional|amigable|formal|casual|emp[aá]tico)/i,
  );

  if (toneMatch) {
    return {
      tone: TONE_VALUES[toneMatch[1].toLowerCase()],
    };
  }

  const langMatch = message.match(
    /idioma\s+(?:a\s+)?(ingl[eé]s|espa[ñn]ol|portugu[eé]s|franc[eé]s)/i,
  );

  if (langMatch) {
    return {
      language: LANGUAGE_VALUES[langMatch[1].toLowerCase()],
    };
  }

  if (
    /(?:activa|habilita|enciende)\s+el\s+agente|el\s+agente\s+(?:est[eé]|quede)\s+activ[oó]/i.test(
      message,
    )
  ) {
    return {
      status: "ACTIVE",
    };
  }

  if (
    /(?:desactiva|apaga|det[eé]n)\s+el\s+agente|el\s+agente\s+(?:est[eé]|quede)\s+inactiv[oó]/i.test(
      message,
    )
  ) {
    return {
      status: "INACTIVE",
    };
  }

  const welcomeMatch =
    message.match(
      /mensaje\s+de\s+bienvenida\s+(?:a\s+)?["“]?([^"”\n]+)["”]?$/i,
    ) ??
    message.match(
      /bienvenida\s+(?:a\s+)?["“]?([^"”\n]+)["”]?$/i,
    );

  if (welcomeMatch && welcomeMatch[1].trim()) {
    return {
      welcomeMessage: welcomeMatch[1].trim(),
    };
  }

  const keyMatch = message.match(
    /(?:api\s*key|clave)\s+(?:a\s+|de\s+|:)?\s*(sk-[A-Za-z0-9_-]+)/i,
  );

  if (keyMatch) {
    return {
      llm: {
        apiKey: keyMatch[1],
      },
    };
  }

  const modelMatch = message.match(
    /modelo\s+(?:a\s+|de\s+|:)?\s*["“]?([A-Za-z0-9][A-Za-z0-9._:/\\-]*[A-Za-z0-9])["”]?\s*$/i,
  );

  if (modelMatch && modelMatch[1].trim()) {
    return {
      llm: {
        model: modelMatch[1].trim(),
      },
    };
  }

  for (const [tool, phrases] of TOOL_PHRASES) {
    if (!phrases.some((phrase) => lower.includes(phrase))) {
      continue;
    }

    const enabled = new Set(
      config?.enabledTools?.length
        ? config.enabledTools
        : [...ALL_TOOLS],
    );

    if (/(?:deshabilita?|desactiva|quita|elimina|bloquea|retira)/i.test(message)) {
      enabled.delete(tool);
    } else {
      enabled.add(tool);
    }

    return {
      enabledTools: [...enabled],
    };
  }

  const addRuleMatch = message.match(
    /(?:agrega|a[ñn]ade|pon|incluye)\s+(?:la\s+|una\s+)?regla\s*[:]?\s*(.+)/i,
  );

  if (addRuleMatch && addRuleMatch[1].trim()) {
    const rules = config?.behaviorRules ? [...config.behaviorRules] : [];

    rules.push(addRuleMatch[1].trim());

    return {
      behaviorRules: rules,
    };
  }

  const removeRuleMatch = message.match(
    /(?:quita|elimina|borra)\s+(?:la\s+|una\s+)?regla\s*[:]?\s*(.+)/i,
  );

  if (removeRuleMatch && removeRuleMatch[1].trim()) {
    const phrase = removeRuleMatch[1].trim().toLowerCase();

    const rules = config?.behaviorRules
      ? config.behaviorRules.filter(
          (rule) => !rule.toLowerCase().includes(phrase),
        )
      : [];

    return {
      behaviorRules: rules,
    };
  }

  return null;
}

class OfflineAgentConfigLLM implements AgentLLMService {
  async complete(messages: AgentChatMessage[]): Promise<AgentLLMResult> {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    const lastTool = [...messages]
      .reverse()
      .find((message) => message.role === "tool");

    const lastAssistantWithTools = [...messages]
      .reverse()
      .find(
        (message) => message.role === "assistant" && message.toolCalls?.length,
      );

    const lastToolName = lastAssistantWithTools?.toolCalls?.at(-1)?.name;

    if (!lastUser) {
      return {
        content:
          "¿En qué te ayudo con la configuración del agente de IA?",
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (!lastTool) {
      return {
        content: "",
        toolCalls: [
          {
            id: "offline-read",
            name: "getAgentConfig",
            arguments: "{}",
          },
        ],
        finishReason: "tool_calls",
      };
    }

    let parsed: AssistantToolResult;

    try {
      parsed = JSON.parse(lastTool.content) as AssistantToolResult;
    } catch {
      parsed = {
        ok: false,
        message: "No fue posible interpretar el resultado",
      };
    }

    if (lastToolName === "getAgentConfig") {
      const config = (parsed.data ?? {}) as AgentConfigLike;

      const update = buildUpdateIntent(lastUser.content, config);

      if (update) {
        return {
          content: "",
          toolCalls: [
            {
              id: "offline-update",
              name: "updateAgentConfig",
              arguments: JSON.stringify(update),
            },
          ],
          finishReason: "tool_calls",
        };
      }

      if (/modelo|api\s*key|clave/i.test(lastUser.content)) {
        return {
          content: [
            "Para configurar el modelo de IA del agente tienes dos opciones:",
            "1. Pídelo aquí: 'configura la API key a sk-0123456789abcdef' (usa tu clave real del proveedor) o 'configura el modelo a gpt-4o-mini'.",
            "2. Ajustarlo en el formulario de esta página, en la sección 'Modelo de IA'.",
            "",
            "Recuerda: sin una API Key configurada el agente trabaja en modo demo sin conexión.",
          ].join("\n"),
          toolCalls: [],
          finishReason: "stop",
        };
      }

      return {
        content: describeConfig(config),
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (lastToolName === "getProducts") {
      const list = (parsed.data ?? []) as Array<{
        name?: string;
        sku?: string;
        unitPrice?: number;
        currency?: string;
      }>;

      if (!list.length) {
        return {
          content: "No hay productos activos en el catálogo.",
          toolCalls: [],
          finishReason: "stop",
        };
      }

      const lines = list.map(
        (product) =>
          `- ${product.name ?? ""}${product.sku ? ` (${product.sku})` : ""}${product.unitPrice ? `: $${product.unitPrice} ${product.currency ?? ""}` : ""}`,
      );

      return {
        content: `Productos del catálogo:\n${lines.join("\n")}`,
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (lastToolName === "updateAgentConfig") {
      return {
        content: parsed.ok
          ? `Listo. ${parsed.message}`
          : `No pude completarlo: ${parsed.message}`,
        toolCalls: [],
        finishReason: "stop",
      };
    }

    return {
      content: parsed.message,
      toolCalls: [],
      finishReason: "stop",
    };
  }
}

const getAgentConfigTool = {
  name: "getAgentConfig",
  description:
    "Obtiene la configuración actual del agente de IA del tenant (nombre, tono, idioma, estado, herramientas, memoria, escalación, catálogo y modelo de IA).",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(ctx: AssistantContext): Promise<AssistantToolResult> {
    let agent = await getAgentByTenant(ctx.tenantId);

    if (!agent) {
      agent = await provisionAgent(ctx.tenantId);
    }

    return {
      ok: true,
      message: "Configuración obtenida",
      data: agent,
    };
  },
};

const updateAgentConfigTool = {
  name: "updateAgentConfig",
  description:
    "Actualiza uno o más campos de la configuración del agente de IA: name, description, personality, systemInstructions, language, tone (PROFESSIONAL, FRIENDLY, FORMAL, CASUAL, EMPATHETIC), commercialObjective, welcomeMessage, behaviorRules (array de reglas), productScope (ALL o SELECTED), allowedProductIds (ids de productos), enabledTools (array de herramientas), status (ACTIVE o INACTIVE), escalation {enabled, keywords, fallbackMessage}, memory {enabled, messageWindow, maxContextTokens, summarizationEnabled}, llm {apiKey, model, baseUrl, maxTokens}. Solo envía los campos que deben cambiar.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nombre del agente" },
      description: { type: "string" },
      personality: { type: "string" },
      systemInstructions: { type: "string" },
      language: { type: "string", description: "Código de idioma: es, en, pt, fr" },
      tone: {
        type: "string",
        enum: ["PROFESSIONAL", "FRIENDLY", "FORMAL", "CASUAL", "EMPATHETIC"],
      },
      commercialObjective: { type: "string" },
      welcomeMessage: { type: "string" },
      behaviorRules: { type: "array", items: { type: "string" } },
      productScope: { type: "string", enum: ["ALL", "SELECTED"] },
      allowedProductIds: { type: "array", items: { type: "string" } },
      enabledTools: {
        type: "array",
        items: {
          type: "string",
          enum: [...ALL_TOOLS],
        },
      },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      escalation: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          keywords: { type: "array", items: { type: "string" } },
          fallbackMessage: { type: "string" },
        },
      },
      memory: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          messageWindow: { type: "number" },
          maxContextTokens: { type: "number" },
          summarizationEnabled: { type: "boolean" },
        },
      },
      llm: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "API Key del proveedor de IA del tenant" },
          model: { type: "string" },
          baseUrl: { type: "string" },
          maxTokens: { type: "number" },
        },
      },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const parsed = updateAgentSchema.safeParse(args);

    if (!parsed.success) {
      return {
        ok: false,
        message: `Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`,
      };
    }

    const agent = await updateAgent(ctx.tenantId, parsed.data);

    return {
      ok: true,
      message: "Configuración del agente actualizada correctamente.",
      data: agent,
    };
  },
};

const getProductsTool = {
  name: "getProducts",
  description:
    "Lista los productos activos del tenant. Útil para recomendar o seleccionar productos en el catálogo del agente (productScope SELECTED y allowedProductIds).",
  parameters: {
    type: "object",
    properties: {
      search: { type: "string", description: "Texto de búsqueda opcional" },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const search = typeof args.search === "string" ? args.search : undefined;

    const result = await getProducts({
      tenantId: ctx.tenantId,
      page: 1,
      limit: 100,
      search,
    });

    return {
      ok: true,
      message: `${result.pagination.total} productos encontrados`,
      data: result.data,
    };
  },
};

const agentConfigAssistant: AssistantDefinition = {
  id: AGENT_CONFIG_ASSISTANT_ID,
  name: "Asistente de configuración",
  description:
    "Configura el agente de IA comercial del tenant mediante conversación.",
  tools: [getAgentConfigTool, updateAgentConfigTool, getProductsTool],

  systemPrompt(ctx: AssistantContext): string {
    return [
      "Eres el asistente de configuración del agente de IA comercial de QuoPilot.",
      "Ayudas al administrador del tenant a consultar y modificar la configuración de su agente mediante conversación.",
      "Usa SIEMPRE las herramientas disponibles para leer o modificar la configuración; no inventes valores.",
      "Cuando el usuario pida un cambio, ejecuta updateAgentConfig con SOLO los campos que cambian y confirma lo que hiciste.",
      "Nunca reveles una API Key completa: al mencionarla, muéstrala enmascarada (primeros y últimos 3 caracteres).",
      "Responde en español, de forma breve y directa.",
      "Herramientas disponibles: getAgentConfig (leer configuración), updateAgentConfig (modificar campos), getProducts (listar el catálogo).",
      `Tenant: ${ctx.tenantId}`,
    ].join("\n");
  },

  async resolveLLM(ctx: AssistantContext): Promise<AgentLLMService> {
    const agent = await getAgentByTenant(ctx.tenantId);

    if (agent?.llm?.apiKey) {
      return createLLMService(agent.llm);
    }

    return new OfflineAgentConfigLLM();
  },
};

registerAssistant(agentConfigAssistant);
