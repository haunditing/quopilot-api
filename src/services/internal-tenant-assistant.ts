import {
  createLLMService,
  type AgentChatMessage,
  type AgentLLMResult,
  type AgentLLMService,
} from "./llm-service.js";
import {
  registerAssistant,
  type AssistantContext,
  type AssistantDefinition,
  type AssistantToolResult,
} from "./assistant-engine.js";
import { getAgentByTenant, provisionAgent, updateAgent } from "./agent-service.js";
import { updateAgentSchema } from "../schemas/agent-schema.js";
import {
  createProduct,
  updateProduct,
  updateProductStatus,
} from "./product-service.js";
import { getProducts } from "./product-query-service.js";
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "../schemas/product-schema.js";
import { createChannel, updateChannel } from "./channel-service.js";
import { listChannels } from "./channel-query-service.js";
import {
  createChannelSchema,
  updateChannelSchema,
} from "../schemas/channel-schema.js";
import {
  getCommercialPolicy,
  updateCommercialPolicy,
} from "./commercial-policy-service.js";
import { getTenantDashboardSummary } from "./tenant-dashboard-service.js";
import { getQuotes, getQuoteStatus } from "./quote-query-service.js";
import { getSales } from "./sale-query-service.js";
import { getCustomers } from "./customer-query-service.js";
import { analyzeWebsite } from "./website-analysis-service.js";
import {
  applyProposal,
  buildProposalFromText,
  clearPendingProposal,
  formatProposal,
  hasPendingProposal,
  stageProposal,
  websiteProposalSchema,
} from "./website-proposal-service.js";

export const INTERNAL_TENANT_ASSISTANT_ID = "tenant-internal-assistant";

function ok(data: unknown, message?: string): AssistantToolResult {
  return {
    ok: true,
    message: message ?? "OK",
    data,
  };
}

function fail(message: string): AssistantToolResult {
  return {
    ok: false,
    message,
  };
}

function compactAgent<T extends object>(agent: T | null) {
  if (!agent) {
    return null;
  }

  const { llm, _id, tenantId, createdAt, updatedAt, ...rest } = agent as Record<
    string,
    unknown
  >;

  return {
    ...rest,
    id: _id,
    llm: llm
      ? {
          model: (llm as Record<string, unknown>).model,
          baseUrl: (llm as Record<string, unknown>).baseUrl,
          maxTokens: (llm as Record<string, unknown>).maxTokens,
          apiKeyConfigured: Boolean(
            (llm as Record<string, unknown>).apiKey,
          ),
        }
      : undefined,
  };
}

function compactProduct<T extends object>(product: T) {
  const { _id, tenantId, createdAt, updatedAt, ...rest } = product as Record<
    string,
    unknown
  >;

  return {
    ...rest,
    id: _id,
  };
}

function compactChannel<T extends object>(channel: T) {
  const { credentials, _id, tenantId, createdAt, updatedAt, ...rest } =
    channel as Record<string, unknown>;

  return {
    ...rest,
    id: _id,
    credentialsConfigured: Boolean(credentials),
  };
}

function compactQuote<T extends object>(quote: T) {
  const { _id, tenantId, createdAt, updatedAt, ...rest } = quote as Record<
    string,
    unknown
  >;

  return {
    ...rest,
    id: _id,
  };
}

function compactSale<T extends object>(sale: T) {
  const { _id, tenantId, createdAt, updatedAt, ...rest } = sale as Record<
    string,
    unknown
  >;

  return {
    ...rest,
    id: _id,
  };
}

function compactCustomer<T extends object>(customer: T) {
  const { _id, tenantId, createdAt, updatedAt, ...rest } = customer as Record<
    string,
    unknown
  >;

  return {
    ...rest,
    id: _id,
  };
}

const getAgentConfigTool = {
  name: "getAgentConfig",
  description:
    "Obtiene la configuración actual del agente de IA comercial del tenant (nombre, tono, idioma, estado, herramientas, memoria, escalación, catálogo y modelo de IA).",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(ctx: AssistantContext): Promise<AssistantToolResult> {
    try {
      let agent = await getAgentByTenant(ctx.tenantId);

      if (!agent) {
        agent = await provisionAgent(ctx.tenantId);
      }

      return ok(compactAgent(agent), "Configuración obtenida");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get agent config",
      );
    }
  },
};

const updateAgentConfigTool = {
  name: "updateAgentConfig",
  description:
    "Actualiza uno o más campos de la configuración del agente de IA: name, description, personality, language, tone, commercialObjective, welcomeMessage, behaviorRules, productScope, allowedProductIds, enabledTools, status, escalation, memory, llm. Solo envía los campos que deben cambiar.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      personality: { type: "string" },
      language: { type: "string", description: "es, en, pt, fr" },
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
        items: { type: "string" },
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
          apiKey: { type: "string" },
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
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    try {
      const agent = await updateAgent(ctx.tenantId, parsed.data);

      return ok(
        compactAgent(agent),
        "Configuración del agente actualizada correctamente.",
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to update agent config",
      );
    }
  },
};

const getProductsTool = {
  name: "getProducts",
  description:
    "Lista los productos del tenant con filtros opcionales (búsqueda, estado, categoría, rango de precio).",
  parameters: {
    type: "object",
    properties: {
      search: { type: "string", description: "Texto de búsqueda opcional" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      category: { type: "string" },
      minPrice: { type: "number" },
      maxPrice: { type: "number" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const result = await getProducts({
        tenantId: ctx.tenantId,
        page: 1,
        limit:
          typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
        search: typeof args.search === "string" ? args.search : undefined,
        status:
          args.status === "INACTIVE" || args.status === "ACTIVE"
            ? args.status
            : undefined,
        category: typeof args.category === "string" ? args.category : undefined,
        minPrice: typeof args.minPrice === "number" ? args.minPrice : undefined,
        maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
      });

      return ok(
        {
          items: result.data.map(compactProduct),
          total: result.pagination.total,
        },
        `${result.pagination.total} productos encontrados`,
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get products",
      );
    }
  },
};

const createProductTool = {
  name: "createProduct",
  description:
    "Crea un producto nuevo en el catálogo del tenant. Requiere name; opcionalmente itemType, description, category, basePrice, taxRate, currency, sku, unitOfMeasure, minStock, maxStock y lowStockAlert.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      itemType: { type: "string", enum: ["PRODUCT", "SERVICE", "COMBO"] },
      description: { type: "string" },
      category: { type: "string" },
      unitOfMeasure: { type: "string" },
      sku: { type: "string" },
      code: { type: "string" },
      barcode: { type: "string" },
      basePrice: { type: "number", minimum: 0 },
      cost: { type: "number", minimum: 0 },
      taxRate: { type: "number", minimum: 0 },
      currency: { type: "string" },
      minStock: { type: "number", minimum: 0 },
      maxStock: { type: "number", minimum: 0 },
      lowStockAlert: { type: "boolean" },
    },
    required: ["name"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const parsed = createProductSchema.safeParse(args);

    if (!parsed.success) {
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    try {
      const product = await createProduct(parsed.data, ctx.tenantId);

      return ok(compactProduct(product), "Producto creado correctamente.");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to create product",
      );
    }
  },
};

const updateProductTool = {
  name: "updateProduct",
  description:
    "Actualiza campos de un producto existente del tenant (name, description, category, basePrice, taxRate, currency, status, etc.). Requiere productId.",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      sku: { type: "string" },
      basePrice: { type: "number", minimum: 0 },
      cost: { type: "number", minimum: 0 },
      taxRate: { type: "number", minimum: 0 },
      currency: { type: "string" },
      minStock: { type: "number", minimum: 0 },
      maxStock: { type: "number", minimum: 0 },
      lowStockAlert: { type: "boolean" },
    },
    required: ["productId"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (typeof args.productId !== "string" || !args.productId.trim()) {
      return fail("Invalid productId");
    }

    const parsed = updateProductSchema.safeParse(args);

    if (!parsed.success) {
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    try {
      const product = await updateProduct(
        ctx.tenantId,
        args.productId,
        parsed.data,
      );

      return ok(compactProduct(product), "Producto actualizado correctamente.");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to update product",
      );
    }
  },
};

const updateProductStatusTool = {
  name: "updateProductStatus",
  description:
    "Activa o desactiva un producto del tenant. Requiere productId y status (ACTIVE o INACTIVE).",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
    },
    required: ["productId", "status"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const parsed = updateProductStatusSchema.safeParse(args);

    if (!parsed.success) {
      return fail("Se requieren productId y status (ACTIVE o INACTIVE)");
    }

    try {
      const product = await updateProductStatus(
        ctx.tenantId,
        args.productId as string,
        parsed.data.status,
      );

      return ok(compactProduct(product), "Estado del producto actualizado.");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to update product status",
      );
    }
  },
};

const getChannelsTool = {
  name: "getChannels",
  description:
    "Lista los canales de venta del tenant (WHATSAPP, WEB_CHAT, INSTAGRAM) con filtros opcionales por tipo y estado.",
  parameters: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["WHATSAPP", "WEB_CHAT", "INSTAGRAM"] },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const result = await listChannels({
        tenantId: ctx.tenantId,
        page: 1,
        limit:
          typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
        type:
          args.type === "WHATSAPP" ||
          args.type === "WEB_CHAT" ||
          args.type === "INSTAGRAM"
            ? args.type
            : undefined,
        status:
          args.status === "ACTIVE" || args.status === "INACTIVE"
            ? args.status
            : undefined,
      });

      return ok(
        {
          items: result.data.map(compactChannel),
          total: result.pagination.total,
        },
        `${result.pagination.total} canales encontrados`,
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get channels",
      );
    }
  },
};

const createChannelTool = {
  name: "createChannel",
  description:
    "Crea un canal de venta para el tenant. Requiere type (WHATSAPP, WEB_CHAT o INSTAGRAM) y name. Para WHATSAPP requiere config.phoneNumber; para INSTAGRAM config.instagramAccountId; para WEB_CHAT config es opcional.",
  parameters: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["WHATSAPP", "WEB_CHAT", "INSTAGRAM"] },
      name: { type: "string" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      config: {
        type: "object",
        properties: {
          phoneNumber: { type: "string" },
          businessAccountId: { type: "string" },
          phoneNumberId: { type: "string" },
          instagramAccountId: { type: "string" },
          igUserId: { type: "string" },
          facebookPageId: { type: "string" },
          widget: {
            type: "object",
            properties: {
              title: { type: "string" },
              greetingMessage: { type: "string" },
              primaryColor: { type: "string" },
              position: {
                type: "string",
                enum: ["bottom-right", "bottom-left"],
              },
            },
          },
        },
      },
    },
    required: ["type", "name"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const parsed = createChannelSchema.safeParse(args);

    if (!parsed.success) {
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    try {
      const channel = await createChannel(ctx.tenantId, parsed.data);

      return ok(
        compactChannel(channel),
        "Canal creado correctamente.",
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to create channel",
      );
    }
  },
};

const updateChannelTool = {
  name: "updateChannel",
  description:
    "Actualiza un canal existente del tenant (name, status o config). Requiere channelId.",
  parameters: {
    type: "object",
    properties: {
      channelId: { type: "string" },
      name: { type: "string" },
      status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      config: {
        type: "object",
        properties: {
          phoneNumber: { type: "string" },
          businessAccountId: { type: "string" },
          phoneNumberId: { type: "string" },
          instagramAccountId: { type: "string" },
          igUserId: { type: "string" },
          facebookPageId: { type: "string" },
        },
      },
    },
    required: ["channelId"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (typeof args.channelId !== "string" || !args.channelId.trim()) {
      return fail("Invalid channelId");
    }

    const parsed = updateChannelSchema.safeParse(args);

    if (!parsed.success) {
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    try {
      const channel = await updateChannel(
        ctx.tenantId,
        args.channelId,
        parsed.data,
      );

      return ok(
        compactChannel(channel),
        "Canal actualizado correctamente.",
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to update channel",
      );
    }
  },
};

const getCommercialPolicyTool = {
  name: "getCommercialPolicy",
  description:
    "Obtiene la política comercial del tenant (términos de pago, descuentos, envíos, garantía, devoluciones).",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(ctx: AssistantContext): Promise<AssistantToolResult> {
    try {
      const policy = await getCommercialPolicy(ctx.tenantId);

      return ok(
        policy ?? null,
        policy ? "Política comercial obtenida" : "No hay política comercial configurada",
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get commercial policy",
      );
    }
  },
};

const updateCommercialPolicyTool = {
  name: "updateCommercialPolicy",
  description:
    "Actualiza o crea la política comercial del tenant: paymentTerms, discountPolicy, shippingPolicy, warrantyPolicy, returnPolicy, notes. Solo envía los campos a cambiar.",
  parameters: {
    type: "object",
    properties: {
      paymentTerms: { type: "string", description: "Términos de pago" },
      discountPolicy: { type: "string", description: "Política de descuentos" },
      shippingPolicy: { type: "string", description: "Política de envíos" },
      warrantyPolicy: { type: "string", description: "Política de garantía" },
      returnPolicy: { type: "string", description: "Política de devoluciones" },
      notes: { type: "string", description: "Notas adicionales" },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const policy = await updateCommercialPolicy(ctx.tenantId, {
        paymentTerms:
          typeof args.paymentTerms === "string" ? args.paymentTerms : undefined,
        discountPolicy:
          typeof args.discountPolicy === "string" ? args.discountPolicy : undefined,
        shippingPolicy:
          typeof args.shippingPolicy === "string" ? args.shippingPolicy : undefined,
        warrantyPolicy:
          typeof args.warrantyPolicy === "string" ? args.warrantyPolicy : undefined,
        returnPolicy:
          typeof args.returnPolicy === "string" ? args.returnPolicy : undefined,
        notes: typeof args.notes === "string" ? args.notes : undefined,
      });

      return ok(policy, "Política comercial actualizada correctamente.");
    } catch (error) {
      return fail(
        error instanceof Error
          ? error.message
          : "Unable to update commercial policy",
      );
    }
  },
};

const getBusinessSummaryTool = {
  name: "getBusinessSummary",
  description:
    "Obtiene un resumen del negocio del tenant: total de cotizaciones, ventas, monto vendido, clientes, productos y agentes activos, y tasa de conversión.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(ctx: AssistantContext): Promise<AssistantToolResult> {
    try {
      const summary = await getTenantDashboardSummary(ctx.tenantId);

      return ok(summary, "Resumen del negocio obtenido");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get business summary",
      );
    }
  },
};

const getQuotesTool = {
  name: "getQuotes",
  description:
    "Lista las cotizaciones del tenant con filtros opcionales por estado, cliente y búsqueda por número.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "DRAFT, SENT, VIEWED, ACCEPTED, REJECTED o EXPIRED",
      },
      customerId: { type: "string" },
      search: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const result = await getQuotes({
        tenantId: ctx.tenantId,
        page: 1,
        limit:
          typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
        status: typeof args.status === "string" ? args.status : undefined,
        customerId:
          typeof args.customerId === "string" ? args.customerId : undefined,
        search: typeof args.search === "string" ? args.search : undefined,
      });

      return ok(
        {
          items: result.data.map(compactQuote),
          total: result.pagination.total,
        },
        `${result.pagination.total} cotizaciones encontradas`,
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get quotes",
      );
    }
  },
};

const getQuoteStatusTool = {
  name: "getQuoteStatus",
  description:
    "Obtiene el estado actual de una cotización del tenant: número, estado, totales, moneda y último evento.",
  parameters: {
    type: "object",
    properties: {
      quoteId: { type: "string" },
    },
    required: ["quoteId"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (typeof args.quoteId !== "string" || !args.quoteId.trim()) {
      return fail("Invalid quoteId");
    }

    try {
      const status = await getQuoteStatus(ctx.tenantId, args.quoteId);

      return ok(status, "Estado de la cotización obtenido");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get quote status",
      );
    }
  },
};

const getSalesTool = {
  name: "getSales",
  description:
    "Lista las ventas del tenant con filtros opcionales por estado, cliente, rango de fecha y monto.",
  parameters: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
      customerId: { type: "string" },
      dateFrom: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
      dateTo: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
      minTotal: { type: "number" },
      maxTotal: { type: "number" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const result = await getSales({
        tenantId: ctx.tenantId,
        page: 1,
        limit:
          typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
        status: args.status === "CONFIRMED" || args.status === "CANCELLED"
          ? args.status
          : undefined,
        customerId:
          typeof args.customerId === "string" ? args.customerId : undefined,
        dateFrom: typeof args.dateFrom === "string" ? args.dateFrom : undefined,
        dateTo: typeof args.dateTo === "string" ? args.dateTo : undefined,
        minTotal: typeof args.minTotal === "number" ? args.minTotal : undefined,
        maxTotal: typeof args.maxTotal === "number" ? args.maxTotal : undefined,
      });

      return ok(
        {
          items: result.data.map(compactSale),
          total: result.pagination.total,
        },
        `${result.pagination.total} ventas encontradas`,
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get sales",
      );
    }
  },
};

const getCustomersTool = {
  name: "getCustomers",
  description:
    "Lista los clientes del tenant con búsqueda opcional por nombre, teléfono o email.",
  parameters: {
    type: "object",
    properties: {
      search: { type: "string" },
      country: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    try {
      const result = await getCustomers({
        tenantId: ctx.tenantId,
        page: 1,
        limit:
          typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
        search: typeof args.search === "string" ? args.search : undefined,
        country: typeof args.country === "string" ? args.country : undefined,
      });

      return ok(
        {
          items: result.data.map(compactCustomer),
          total: result.pagination.total,
        },
        `${result.pagination.total} clientes encontrados`,
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to get customers",
      );
    }
  },
};

const analyzeWebsiteTool = {
  name: "analyzeWebsite",
  description:
    "Obtiene y limpia el texto público de una página web para ayudar al administrador a configurar su negocio (por ejemplo, para extraer información de su sitio web). Recibe una URL http/https pública.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL pública http/https de la página a analizar" },
    },
    required: ["url"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    if (typeof args.url !== "string" || !args.url.trim()) {
      return fail("Se requiere una URL válida (http/https).");
    }

    try {
      const result = await analyzeWebsite({ url: args.url });

      return ok(result, "Contenido de la página obtenido correctamente.");
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to analyze website",
      );
    }
  },
};

const saveWebsiteProposalTool = {
  name: "saveWebsiteProposal",
  description:
    "Guarda una propuesta pendiente de configuración derivada del análisis de una página web. No persiste nada: queda en memoria hasta que el usuario la confirme explícitamente. Recibe la propuesta completa (url, tenant, agent, products y commercialPolicy).",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string" },
      tenant: {
        type: "object",
        description:
          "Datos de la empresa extraídos de la web (name, website, email, phone, address, city, country).",
      },
      agent: {
        type: "object",
        description:
          "Configuración sugerida del agente (name, description, tone, language, welcomeMessage, commercialObjective, behaviorRules).",
      },
      products: {
        type: "array",
        description: "Productos detectados en la web (máximo 50).",
        items: {
          type: "object",
          description:
            "Producto con al menos name; opcionalmente description, category, basePrice, currency.",
        },
      },
      commercialPolicy: {
        type: "object",
        description: "Política comercial detectada.",
        properties: {
          paymentTerms: { type: "string" },
          discountPolicy: { type: "string" },
          shippingPolicy: { type: "string" },
          warrantyPolicy: { type: "string" },
          returnPolicy: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    required: ["url"],
    additionalProperties: false,
  },

  async execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult> {
    const parsed = websiteProposalSchema.safeParse(args);

    if (!parsed.success) {
      return fail(`Datos inválidos: ${JSON.stringify(parsed.error.flatten())}`);
    }

    const stored = stageProposal(ctx.tenantId, parsed.data);

    return ok(
      { stored },
      "Propuesta guardada en memoria. Nada se persiste hasta confirmación explícita.",
    );
  },
};

const confirmWebsiteProposalTool = {
  name: "confirmWebsiteProposal",
  description:
    "Aplica la propuesta pendiente del análisis de la página web: actualiza el tenant, el agente, crea los productos y actualiza la política comercial. Solo debe llamarse después de la confirmación explícita del usuario.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(ctx: AssistantContext): Promise<AssistantToolResult> {
    try {
      const summary = await applyProposal(ctx.tenantId);

      return ok(
        summary,
        "Propuesta aplicada correctamente al negocio del tenant.",
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Unable to confirm website proposal",
      );
    }
  },
};

class OfflineInternalTenantLLM implements AgentLLMService {
  constructor(private readonly tenantId: string) {}

  async complete(messages: AgentChatMessage[]): Promise<AgentLLMResult> {
    const lastTool = [...messages]
      .reverse()
      .find((message) => message.role === "tool");

    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    const lastAssistantWithTools = [...messages]
      .reverse()
      .find(
        (message) => message.role === "assistant" && message.toolCalls?.length,
      );

    const lastToolName = lastAssistantWithTools?.toolCalls?.at(-1)?.name;

    if (!lastTool && !lastUser) {
      return {
        content:
          "Hola, soy la asistente interna de QuoPilot para tu negocio. Puedo ayudarte a configurar tu agente, tus productos, tus canales, tus políticas comerciales y a consultar la información de tu negocio.",
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (!lastTool) {
      const pending = hasPendingProposal(this.tenantId);

      if (pending) {
        const text = lastUser?.content.toLowerCase() ?? "";

        if (
          /\b(confirmar|confirma|guardar|guarda|dale|adelante|s[ií]|ok|aprobado|de acuerdo|listo)\b/.test(
            text,
          )
        ) {
          return {
            content: "",
            toolCalls: [
              {
                id: "offline-confirm-proposal",
                name: "confirmWebsiteProposal",
                arguments: "{}",
              },
            ],
            finishReason: "tool_calls",
          };
        }

        if (/\b(cancelar|cancela|descartar|descartar|no)\b/.test(text)) {
          clearPendingProposal(this.tenantId);
          return {
            content: "Entendido, he descartado la propuesta pendiente.",
            toolCalls: [],
            finishReason: "stop",
          };
        }

        return {
          content:
            "Hay una propuesta de configuración pendiente basada en el análisis de tu web. ¿Deseas que la guarde y aplique? (Responde 'confirmar' o 'cancelar').",
          toolCalls: [],
          finishReason: "stop",
        };
      }

      const urlMatch = lastUser?.content.match(/https?:\/\/[^\s]+/i);

      if (urlMatch) {
        return {
          content: "",
          toolCalls: [
            {
              id: "offline-analyze-website",
              name: "analyzeWebsite",
              arguments: JSON.stringify({ url: urlMatch[0].replace(/[.,;:]+$/, "") }),
            },
          ],
          finishReason: "tool_calls",
        };
      }

      return {
        content: "",
        toolCalls: [
          {
            id: "offline-biz-summary",
            name: "getBusinessSummary",
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
      parsed = { ok: false, message: "No fue posible interpretar el resultado" };
    }

    if (lastToolName === "getBusinessSummary" && parsed.ok) {
      const data = (parsed.data ?? {}) as {
        quotes?: { total?: number; sent?: number; accepted?: number };
        sales?: { total?: number; amount?: number };
        customers?: { total?: number };
        products?: { total?: number };
        agents?: { total?: number };
        conversionRate?: number;
      };

      return {
        content: [
          "Resumen de tu negocio:",
          `- Cotizaciones: ${data.quotes?.total ?? 0} total, ${data.quotes?.sent ?? 0} enviadas, ${data.quotes?.accepted ?? 0} aceptadas`,
          `- Ventas confirmadas: ${data.sales?.total ?? 0} ($${data.sales?.amount ?? 0})`,
          `- Clientes: ${data.customers?.total ?? 0}`,
          `- Productos: ${data.products?.total ?? 0}`,
          `- Agentes activos: ${data.agents?.total ?? 0}`,
          `- Tasa de conversión: ${data.conversionRate ?? 0}%`,
          "",
          "Estoy en modo de demostración sin conexión a un modelo de lenguaje. Puedo ayudarte con: configuración del agente, productos, canales, políticas comerciales y consultas de tu negocio.",
        ].join("\n"),
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (lastToolName === "analyzeWebsite" && parsed.ok) {
      const data = (parsed.data ?? {}) as {
        url?: string;
        title?: string;
        text?: string;
        finalUrl?: string;
      };

      const proposal = buildProposalFromText({
        url: data.finalUrl ?? data.url ?? "https://example.com",
        title: data.title,
        text: data.text ?? "",
      });

      stageProposal(this.tenantId, proposal);

      const formatted = formatProposal(proposal);

      return {
        content: [
          formatted,
          "",
          "¿Quieres que aplique esta configuración a tu negocio? (Responde 'confirmar' para aplicarla o 'cancelar' para descartarla).",
        ].join("\n"),
        toolCalls: [
          {
            id: "offline-save-proposal",
            name: "saveWebsiteProposal",
            arguments: JSON.stringify(proposal),
          },
        ],
        finishReason: "tool_calls",
      };
    }

    if (lastToolName === "saveWebsiteProposal" && parsed.ok) {
      return {
        content:
          "He guardado la propuesta en memoria. Revisa los detalles anteriores y dime si deseas confirmarla.",
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (lastToolName === "confirmWebsiteProposal" && parsed.ok) {
      const summary = (parsed.data ?? {}) as {
        tenant?: boolean;
        agent?: boolean;
        products?: number;
        commercialPolicy?: boolean;
        errors?: string[];
      };

      const lines = ["¡Listo! Propuesta aplicada con éxito:"];
      if (summary.tenant) lines.push("- Empresa actualizada.");
      if (summary.agent) lines.push("- Agente de IA configurado.");
      if (summary.products && summary.products > 0)
        lines.push(`- Se crearon ${summary.products} producto(s).`);
      if (summary.commercialPolicy) lines.push("- Política comercial actualizada.");
      if (summary.errors?.length) {
        lines.push("", "Algunos elementos tuvieron problemas:");
        for (const err of summary.errors) {
          lines.push(`- ${err}`);
        }
      }

      return {
        content: lines.join("\n"),
        toolCalls: [],
        finishReason: "stop",
      };
    }

    return {
      content: parsed.ok
        ? `Listo. ${parsed.message}`
        : `No pude completarlo: ${parsed.message}`,
      toolCalls: [],
      finishReason: "stop",
    };
  }
}

const internalTenantAssistant: AssistantDefinition = {
  id: INTERNAL_TENANT_ASSISTANT_ID,
  name: "Asistente interno de QuoPilot",
  description:
    "Asistente interno de QuoPilot que ayuda al administrador del tenant a configurar y utilizar la plataforma.",
  tools: [
    getAgentConfigTool,
    updateAgentConfigTool,
    getProductsTool,
    createProductTool,
    updateProductTool,
    updateProductStatusTool,
    getChannelsTool,
    createChannelTool,
    updateChannelTool,
    getCommercialPolicyTool,
    updateCommercialPolicyTool,
    getBusinessSummaryTool,
    analyzeWebsiteTool,
    saveWebsiteProposalTool,
    confirmWebsiteProposalTool,
    getQuotesTool,
    getQuoteStatusTool,
    getSalesTool,
    getCustomersTool,
  ],

  systemPrompt(ctx: AssistantContext): string {
    return [
      "Eres la asistente interna de QuoPilot, orientada al administrador del tenant dentro del panel de QuoPilot.",
      "Tu objetivo es ayudar al administrador a configurar y utilizar la plataforma: configurar su agente comercial, sus productos, sus políticas comerciales, sus canales de venta, y consultar la información de su negocio.",
      "NO atiendes a clientes finales ni a visitantes: tu usuario es el administrador del negocio.",
      "Trabajas EXCLUSIVAMENTE con los datos del tenant actual. Nunca accedas a datos de otros tenants.",
      "Usa SIEMPRE las herramientas disponibles para leer o modificar datos; no inventes valores.",
      "Cuando el usuario pida un cambio, ejecuta la herramienta correspondiente con SOLO los campos que cambian y confirma lo que hiciste.",
      "Para analizar la página web del negocio: analiza el sitio con analyzeWebsite, guarda la propuesta con saveWebsiteProposal y preséntala al usuario. NUNCA apliques productos, precios, políticas ni datos inferidos sin la confirmación explícita del usuario; usa confirmWebsiteProposal solo después de su confirmación.",
      "Nunca reveles una API Key completa: al mencionarla, muéstrala enmascarada (primeros y últimos 3 caracteres).",
      "Responde en español, de forma breve y directa.",
      `Tenant: ${ctx.tenantId}`,
    ].join("\n");
  },

  async resolveLLM(ctx: AssistantContext): Promise<AgentLLMService> {
    const agent = await getAgentByTenant(ctx.tenantId);

    if (agent?.llm?.apiKey) {
      return createLLMService(agent.llm);
    }

    return new OfflineInternalTenantLLM(ctx.tenantId);
  },
};

registerAssistant(internalTenantAssistant);