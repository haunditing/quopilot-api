import mongoose from "mongoose";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { SupportAssistantConfig } from "../models/SupportAssistantConfig.js";
import { getSuperAdminDashboardSummary } from "./super-admin-dashboard-service.js";

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

export async function getPlatformSummaryTool(): Promise<PlatformToolResult> {
  try {
    const summary = await getSuperAdminDashboardSummary();

    return ok(
      {
        tenants: {
          total: summary.tenants.total,
          active: summary.tenants.active,
        },
        users: {
          total: summary.users.total,
        },
        quotes: {
          total: summary.quotes.total,
        },
        sales: {
          total: summary.sales.total,
          amount: summary.sales.amount,
        },
      },
      "Resumen de la plataforma obtenido",
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get platform summary",
    );
  }
}

export async function getTenantInfoTool(args: {
  tenantId?: string;
  search?: string;
}): Promise<PlatformToolResult> {
  const filter: Record<string, unknown> = {};

  if (args.tenantId?.trim()) {
    filter._id = args.tenantId.trim();
  }

  if (args.search?.trim()) {
    const searchRegex = new RegExp(args.search.trim(), "i");
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { taxId: searchRegex },
    ];
  }

  try {
    const tenants = await Tenant.find(filter)
      .select("-createdAt -updatedAt -__v")
      .limit(10)
      .lean();

    if (tenants.length === 0) {
      return ok([], "No se encontraron tenants con esos criterios");
    }

    const compactTenants = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, agentCount] = await Promise.all([
          User.countDocuments({ tenantId: tenant._id }),
          User.countDocuments({ tenantId: tenant._id, role: "AGENT" }),
        ]);

        return {
          id: tenant._id,
          name: tenant.name,
          status: tenant.status,
          email: tenant.email,
          taxId: tenant.taxId,
          currency: tenant.currency,
          users: userCount,
          agents: agentCount,
        };
      }),
    );

    return ok(
      compactTenants,
      `${compactTenants.length} tenant(s) encontrado(s)`,
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to get tenant info",
    );
  }
}

export async function getSystemStatusTool(): Promise<PlatformToolResult> {
  try {
    const config = await SupportAssistantConfig.findOne().lean();
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

export const PLATFORM_TOOLS: Record<
  string,
  (args: Record<string, unknown>) => Promise<PlatformToolResult>
> = {
  getPlatformSummary: () => getPlatformSummaryTool(),
  getTenantInfo: (args) =>
    getTenantInfoTool(args as { tenantId?: string; search?: string }),
  getSystemStatus: () => getSystemStatusTool(),
};

export const PLATFORM_TOOL_DEFINITIONS = [
  {
    name: "getPlatformSummary",
    description:
      "Obtiene el resumen de la plataforma: total de tenants, usuarios, cotizaciones y ventas. No requiere argumentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getTenantInfo",
    description:
      "Consulta información real de uno o más tenants (empresas) por tenantId o búsqueda por nombre, email o NIT: estado, moneda y número de usuarios/agentes.",
    parameters: {
      type: "object",
      properties: {
        tenantId: { type: "string" },
        search: { type: "string" },
      },
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
] as const;