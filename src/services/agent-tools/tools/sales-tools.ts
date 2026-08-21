import { registerCapabilities } from "../../../capabilities/registry.js";

import { getSales } from "../../sale-query-service.js";
import {
  failResult,
  normalizeLimit,
  okResult,
  type AgentTool,
  type AgentToolContext,
} from "../types.js";

export const getSalesTool: AgentTool = {
  name: "getSales",
  description:
    "Consulta las ventas del cliente actual (o de un cliente indicado), con filtros opcionales por estado y rango de fechas.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description:
          "ID del cliente. Si no se indica, se usa el cliente de la conversación actual",
      },
      status: {
        type: "string",
        description: "Filtro por estado: CONFIRMED o CANCELLED",
      },
      dateFrom: {
        type: "string",
        description: "Filtro desde una fecha (YYYY-MM-DD)",
      },
      dateTo: {
        type: "string",
        description: "Filtro hasta una fecha (YYYY-MM-DD)",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Máximo de resultados (por defecto 5)",
      },
    },
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    const limit = normalizeLimit(args.limit, 10, 5);

    const result = await getSales({
      tenantId: ctx.tenantId,
      page: 1,
      limit,
      customerId:
        typeof args.customerId === "string" && args.customerId.trim()
          ? args.customerId
          : ctx.customerId,
      status:
        typeof args.status === "string" &&
        (args.status === "CONFIRMED" || args.status === "CANCELLED")
          ? args.status
          : undefined,
      dateFrom:
        typeof args.dateFrom === "string" ? args.dateFrom : undefined,
      dateTo: typeof args.dateTo === "string" ? args.dateTo : undefined,
    });

    return okResult({
      items: result.data.map((sale) => ({
        id: sale._id.toString(),
        number: sale.number,
        status: sale.status,
        total: sale.total,
        currency: sale.currency,
        soldAt: sale.soldAt,
      })),
      total: result.pagination.total,
    });
  },
};

export const salesTools: AgentTool[] = [getSalesTool];

registerCapabilities([
  {
    module: "agent",
    code: "agent.getSales",
    name: "getSales",
    description:
      "Consulta las ventas del cliente actual (o de un cliente indicado), con filtros por estado y fechas.",
    kind: "IA",
    dependencies: [{ code: "sales.view", type: "OBLIGATORIA" }],
  },
]);
