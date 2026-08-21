import { registerCapabilities } from "../../../capabilities/registry.js";

import { getCustomers } from "../../customer-query-service.js";
import { updateCustomer as updateCustomerRecord } from "../../customer-service.js";
import { getQuotes } from "../../quote-query-service.js";
import { getSales } from "../../sale-query-service.js";
import { loadCustomerHistory } from "../../context-builder/loaders.js";
import type { UpdateCustomerInput } from "../../../schemas/customer-schema.js";
import {
  failResult,
  normalizeLimit,
  okResult,
  type AgentTool,
  type AgentToolContext,
} from "../types.js";

interface CustomerSummary {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
}

export const searchCustomersTool: AgentTool = {
  name: "searchCustomers",
  description:
    "Busca clientes del tenant por nombre, teléfono o correo electrónico.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Texto de búsqueda del cliente",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Máximo de resultados (por defecto 5)",
      },
    },
    required: ["search"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    const limit = normalizeLimit(args.limit, 10, 5);

    const result = await getCustomers({
      tenantId: ctx.tenantId,
      page: 1,
      limit,
      search: typeof args.search === "string" ? args.search : undefined,
    });

    const customers: CustomerSummary[] = result.data.map((customer) => ({
      id: customer._id.toString(),
      name: customer.name ?? "",
      phone: customer.phone,
      email: customer.email,
      country: customer.country,
    }));

    return okResult({
      items: customers,
      total: customers.length,
    });
  },
};

export const getCustomerHistoryTool: AgentTool = {
  name: "getCustomerHistory",
  description:
    "Obtiene el historial comercial de un cliente del tenant: ventas confirmadas, total invertido, última compra, cotizaciones abiertas y las cotizaciones y ventas más recientes.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "ID del cliente",
      },
    },
    required: ["customerId"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    if (typeof args.customerId !== "string" || !args.customerId.trim()) {
      return failResult("Invalid customerId");
    }

    try {
      const [history, quotes, sales] = await Promise.all([
        loadCustomerHistory(ctx.tenantId, args.customerId),
        getQuotes({
          tenantId: ctx.tenantId,
          page: 1,
          limit: 5,
          customerId: args.customerId,
        }),
        getSales({
          tenantId: ctx.tenantId,
          page: 1,
          limit: 5,
          customerId: args.customerId,
          status: "CONFIRMED",
        }),
      ]);

      return okResult({
        history,
        recentQuotes: quotes.data.map((quote) => ({
          id: quote._id.toString(),
          number: quote.number,
          status: quote.status,
          total: quote.total,
          currency: quote.currency,
          createdAt: quote.createdAt,
        })),
        recentSales: sales.data.map((sale) => ({
          id: sale._id.toString(),
          number: sale.number,
          total: sale.total,
          currency: sale.currency,
          soldAt: sale.soldAt,
        })),
      });
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Unable to load customer history",
      );
    }
  },
};

export const updateCustomerTool: AgentTool = {
  name: "updateCustomer",
  description:
    "Actualiza los datos básicos de un cliente del tenant: nombre, correo electrónico, teléfono o país. Envía solo los campos que deben cambiar.",
  kind: "WRITE",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "ID del cliente a actualizar",
      },
      name: {
        type: "string",
        description: "Nombre del cliente",
      },
      email: {
        type: "string",
        description: "Correo electrónico",
      },
      phone: {
        type: "string",
        description: "Teléfono",
      },
      country: {
        type: "string",
        description: "País",
      },
    },
    required: ["customerId"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    if (typeof args.customerId !== "string" || !args.customerId.trim()) {
      return failResult("Invalid customerId");
    }

    const input: UpdateCustomerInput = {};

    if (typeof args.name === "string" && args.name.trim()) {
      input.name = args.name.trim();
    }

    if (typeof args.email === "string" && args.email.trim()) {
      input.email = args.email.trim();
    }

    if (typeof args.phone === "string" && args.phone.trim()) {
      input.phone = args.phone.trim();
    }

    if (typeof args.country === "string" && args.country.trim()) {
      input.country = args.country.trim();
    }

    if (Object.keys(input).length === 0) {
      return failResult("At least one field to update is required");
    }

    try {
      const customer = await updateCustomerRecord(
        ctx.tenantId,
        args.customerId,
        input,
      );

      return okResult({
        id: customer._id.toString(),
        name: customer.name ?? "",
        phone: customer.phone,
        email: customer.email,
        country: customer.country,
      });
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Unable to update customer",
      );
    }
  },
};

export const customerTools: AgentTool[] = [
  searchCustomersTool,
  getCustomerHistoryTool,
  updateCustomerTool,
];

registerCapabilities([
  {
    module: "agent",
    code: "agent.searchCustomers",
    name: "searchCustomers",
    description:
      "Busca clientes del tenant por nombre, teléfono o correo electrónico.",
    kind: "IA",
    dependencies: [{ code: "customers.view", type: "OBLIGATORIA" }],
  },
  {
    module: "agent",
    code: "agent.getCustomerHistory",
    name: "getCustomerHistory",
    description:
      "Obtiene el historial comercial de un cliente: ventas, total invertido, última compra y cotizaciones abiertas.",
    kind: "IA",
    dependencies: [{ code: "customers.view", type: "OBLIGATORIA" }],
  },
  {
    module: "agent",
    code: "agent.updateCustomer",
    name: "updateCustomer",
    description:
      "Actualiza datos básicos de un cliente (nombre, correo, teléfono, país).",
    kind: "IA",
    dependencies: [{ code: "customers.update", type: "OBLIGATORIA" }],
  },
]);
