import mongoose from "mongoose";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { Product } from "../models/Product.js";
import { Channel } from "../models/Channel.js";
import { SupportAssistantConfig } from "../models/SupportAssistantConfig.js";

export interface PlatformToolResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

function ok(data: unknown, message: string): PlatformToolResult {
  return { ok: true, message, data };
}

function fail(message: string): PlatformToolResult {
  return { ok: false, message };
}

export async function getTenantSummaryTool(tenantId: string): Promise<PlatformToolResult> {
  try {
    const [tenant, userCount, agentCount, quoteCount, saleCount, productCount, channelCount] = await Promise.all([
      Tenant.findById(tenantId).select("-createdAt -updatedAt -__v").lean(),
      User.countDocuments({ tenantId }),
      User.countDocuments({ tenantId, role: "AGENT" }),
      Quote.countDocuments({ tenantId }),
      Sale.countDocuments({ tenantId, status: "CONFIRMED" }),
      Product.countDocuments({ tenantId, enabled: true }),
      Channel.countDocuments({ tenantId }),
    ]);

    if (!tenant) {
      return fail("Tenant no encontrado");
    }

    return ok(
      {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          status: tenant.status,
          currency: tenant.currency,
          timezone: tenant.timezone,
        },
        users: userCount,
        agents: agentCount,
        quotes: quoteCount,
        sales: saleCount,
        products: productCount,
        channels: channelCount,
      },
      "Resumen del tenant obtenido",
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get tenant summary",
    );
  }
}

export async function getAgentConfigTool(tenantId: string): Promise<PlatformToolResult> {
  try {
    const config = await SupportAssistantConfig.findOne().lean();

    return ok(
      {
        status: config?.status ?? "ACTIVE",
        llmConfigured: Boolean(config?.llm?.provider && config?.llm?.apiKey),
        provider: config?.llm?.provider ?? null,
        model: config?.llm?.model ?? null,
      },
      "Configuración del agente obtenida",
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get agent config",
    );
  }
}

export async function getSystemStatusTool(tenantId: string): Promise<PlatformToolResult> {
  try {
    const config = await SupportAssistantConfig.findOne({ tenantId }).lean();
    const llmConfigured = Boolean(
      config?.llm?.provider && config?.llm?.apiKey,
    );

    return ok(
      {
        database: {
          connected: mongoose.connection.readyState === 1,
        },
        supportAssistant: {
          status: config?.status ?? "ACTIVE",
          llmConfigured,
          provider: config?.llm?.provider ?? null,
          model: config?.llm?.model ?? null,
        },
        time: new Date().toISOString(),
      },
      "Estado del sistema obtenido",
    );
  } catch (error) {
    return ok(
      {
        database: {
          connected: mongoose.connection.readyState === 1,
        },
        supportAssistant: {
          llmConfigured: false,
        },
      },
      "Estado del sistema obtenido (parcial)",
    );
  }
}

export async function getQuotesTool(tenantId: string, args: { status?: string; limit?: number }): Promise<PlatformToolResult> {
  try {
    const filter: Record<string, unknown> = { tenantId };
    if (args.status) filter.status = args.status;
    const limit = args.limit ?? 10;

    const quotes = await Quote.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("number customerId status total currency createdAt")
      .lean();

    return ok(quotes, `${quotes.length} cotización(es) encontrada(s)`);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get quotes",
    );
  }
}

export async function getSalesTool(tenantId: string, args: { status?: string; limit?: number }): Promise<PlatformToolResult> {
  try {
    const filter: Record<string, unknown> = { tenantId };
    if (args.status) filter.status = args.status;
    const limit = args.limit ?? 10;

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("number customerId status total currency createdAt")
      .lean();

    return ok(sales, `${sales.length} venta(s) encontrada(s)`);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get sales",
    );
  }
}

export async function getProductsTool(tenantId: string, args: { search?: string; limit?: number }): Promise<PlatformToolResult> {
  try {
    const filter: Record<string, unknown> = { tenantId, enabled: true };
    if (args.search?.trim()) {
      const searchRegex = new RegExp(args.search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex },
      ];
    }
    const limit = args.limit ?? 10;

    const products = await Product.find(filter)
      .limit(limit)
      .select("name sku unitPrice currency stock description")
      .lean();

    return ok(products, `${products.length} producto(s) encontrado(s)`);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get products",
    );
  }
}

export async function getCustomersTool(tenantId: string, args: { search?: string; limit?: number }): Promise<PlatformToolResult> {
  try {
    const filter: Record<string, unknown> = { tenantId };
    if (args.search?.trim()) {
      const searchRegex = new RegExp(args.search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }
    const limit = args.limit ?? 10;

    const customers = await (await import("../models/Customer.js")).Customer.find(filter)
      .limit(limit)
      .select("name email phone address taxId")
      .lean();

    return ok(customers, `${customers.length} cliente(s) encontrado(s)`);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get customers",
    );
  }
}

export async function getChannelsTool(tenantId: string): Promise<PlatformToolResult> {
  try {
    const channels = await Channel.find({ tenantId })
      .select("name type status config")
      .lean();

    return ok(channels, `${channels.length} canal(es) encontrado(s)`);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get channels",
    );
  }
}

export const PLATFORM_TOOLS: Record<
  string,
  (tenantId: string, args: Record<string, unknown>) => Promise<PlatformToolResult>
> = {
  getTenantSummary: (tenantId) => getTenantSummaryTool(tenantId),
  getAgentConfig: (tenantId) => getAgentConfigTool(tenantId),
  getSystemStatus: (tenantId) => getSystemStatusTool(tenantId),
  getQuotes: (tenantId, args) => getQuotesTool(tenantId, args),
  getSales: (tenantId, args) => getSalesTool(tenantId, args),
  getProducts: (tenantId, args) => getProductsTool(tenantId, args),
  getCustomers: (tenantId, args) => getCustomersTool(tenantId, args),
  getChannels: (tenantId) => getChannelsTool(tenantId),
};

export const PLATFORM_TOOL_DEFINITIONS = [
  {
    name: "getTenantSummary",
    description:
      "Obtiene el resumen del tenant: nombre, estado, moneda, zona horaria, y conteos de usuarios, agentes, cotizaciones, ventas, productos y canales. No requiere argumentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getAgentConfig",
    description:
      "Obtiene la configuración del agente comercial: estado, proveedor LLM, y tools habilitadas según el plan. No requiere argumentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getSystemStatus",
    description:
      "Obtiene el estado del sistema: conexión a la base de datos y si el proveedor de IA está configurado. No requiere argumentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getQuotes",
    description:
      "Lista cotizaciones del tenant con filtros opcionales por estado y límite.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getSales",
    description:
      "Lista ventas del tenant con filtros opcionales por estado y límite.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getProducts",
    description:
      "Busca productos del tenant por término de búsqueda y límite.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getCustomers",
    description:
      "Busca clientes del tenant por término de búsqueda y límite.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getChannels",
    description:
      "Lista los canales configurados del tenant. No requiere argumentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
] as const;