import { Types } from "mongoose";
import { getQuotes, getQuoteStatus } from "../../quote-query-service.js";
import { createQuote, updateQuote } from "../../quote-service.js";
import { linkQuoteDraftToConversation } from "../../agent-conversation-service.js";
import {
  failResult,
  isProductAllowed,
  normalizeLimit,
  okResult,
  type AgentTool,
  type AgentToolContext,
} from "../types.js";

interface QuoteItemInput {
  productId: string;
  quantity: number;
}

function parseItems(raw: unknown): QuoteItemInput[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const items: QuoteItemInput[] = [];

  for (const entry of raw) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { productId?: unknown }).productId !== "string" ||
      typeof (entry as { quantity?: unknown }).quantity !== "number"
    ) {
      return null;
    }

    const productId = (entry as { productId: string }).productId;
    const quantity = Math.floor(
      (entry as { quantity: number }).quantity,
    );

    if (!productId.trim() || !Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    items.push({
      productId,
      quantity,
    });
  }

  return items.length > 0 ? items : null;
}

function compactQuote(quote: {
  _id: Types.ObjectId;
  number: string;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  customerId: Types.ObjectId;
  items: Array<{
    productId: Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  validUntil?: Date;
  createdAt: Date;
}) {
  return {
    id: quote._id.toString(),
    number: quote.number,
    status: quote.status,
    subtotal: quote.subtotal,
    total: quote.total,
    currency: quote.currency,
    customerId: quote.customerId.toString(),
    validUntil: quote.validUntil,
    createdAt: quote.createdAt,
    items: quote.items.map((item) => ({
      productId: item.productId.toString(),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

export const getQuotesTool: AgentTool = {
  name: "getQuotes",
  description:
    "Lista las cotizaciones del cliente actual (o de un cliente indicado), con filtros opcionales por estado y número. Útil para consultar el historial de cotizaciones.",
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
        description:
          "Filtro por estado: DRAFT, SENT, VIEWED, ACCEPTED, REJECTED o EXPIRED",
      },
      search: {
        type: "string",
        description: "Número de cotización a buscar",
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

    const result = await getQuotes({
      tenantId: ctx.tenantId,
      page: 1,
      limit,
      customerId:
        typeof args.customerId === "string" && args.customerId.trim()
          ? args.customerId
          : ctx.customerId,
      status: typeof args.status === "string" ? args.status : undefined,
      search: typeof args.search === "string" ? args.search : undefined,
    });

    return okResult({
      items: result.data.map(compactQuote),
      total: result.pagination.total,
    });
  },
};

export const getQuoteStatusTool: AgentTool = {
  name: "getQuoteStatus",
  description:
    "Obtiene el estado actual de una cotización del tenant: estado, totales, fecha de vencimiento, fechas clave y el último evento registrado.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      quoteId: {
        type: "string",
        description: "ID de la cotización",
      },
    },
    required: ["quoteId"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    if (typeof args.quoteId !== "string" || !args.quoteId.trim()) {
      return failResult("Invalid quoteId");
    }

    try {
      const status = await getQuoteStatus(ctx.tenantId, args.quoteId);

      return okResult(status);
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Quote not found",
      );
    }
  },
};

export const createQuoteTool: AgentTool = {
  name: "createQuote",
  description:
    "Crea una cotización en borrador (DRAFT) para un cliente con una lista de productos y cantidades, y la vincula a la conversación actual. Solo puede haber una cotización borrador por conversación.",
  kind: "WRITE",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description:
          "ID del cliente. Si no se indica, se usa el cliente de la conversación actual",
      },
      items: {
        type: "array",
        description: "Lista de productos con cantidades",
        items: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "ID del producto",
            },
            quantity: {
              type: "integer",
              minimum: 1,
              description: "Cantidad",
            },
          },
          required: ["productId", "quantity"],
          additionalProperties: false,
        },
      },
      validUntil: {
        type: "string",
        description: "Fecha límite de validez en formato ISO (opcional)",
      },
    },
    required: ["items"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    const customerId =
      typeof args.customerId === "string" && args.customerId.trim()
        ? args.customerId
        : ctx.customerId;

    if (!Types.ObjectId.isValid(customerId)) {
      return failResult("Invalid customerId");
    }

    const items = parseItems(args.items);

    if (!items) {
      return failResult("Items must be an array of { productId, quantity }");
    }

    const outOfScope = items.find(
      (item) => !isProductAllowed(item.productId, ctx.agent),
    );

    if (outOfScope) {
      return failResult(
        `Product ${outOfScope.productId} is not available in the agent's catalog scope`,
      );
    }

    try {
      const quote = await createQuote(
        {
          customerId,
          conversationId: ctx.conversationId,
          items,
          validUntil:
            typeof args.validUntil === "string" ? args.validUntil : undefined,
        },
        ctx.tenantId,
      );

      await linkQuoteDraftToConversation(
        ctx.tenantId,
        ctx.conversationId,
        quote._id.toString(),
      );

      return okResult(compactQuote(quote));
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Unable to create quote",
      );
    }
  },
};

export const updateQuoteTool: AgentTool = {
  name: "updateQuote",
  description:
    "Modifica una cotización en estado DRAFT del tenant: reemplaza la lista de productos y cantidades. No se pueden modificar cotizaciones enviadas o en otro estado.",
  kind: "WRITE",
  parameters: {
    type: "object",
    properties: {
      quoteId: {
        type: "string",
        description: "ID de la cotización en borrador a modificar",
      },
      items: {
        type: "array",
        description: "Nueva lista de productos con cantidades",
        items: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "ID del producto",
            },
            quantity: {
              type: "integer",
              minimum: 1,
              description: "Cantidad",
            },
          },
          required: ["productId", "quantity"],
          additionalProperties: false,
        },
      },
      validUntil: {
        type: "string",
        description: "Fecha límite de validez en formato ISO (opcional)",
      },
    },
    required: ["quoteId", "items"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    if (typeof args.quoteId !== "string" || !args.quoteId.trim()) {
      return failResult("Invalid quoteId");
    }

    const items = parseItems(args.items);

    if (!items) {
      return failResult("Items must be an array of { productId, quantity }");
    }

    const outOfScope = items.find(
      (item) => !isProductAllowed(item.productId, ctx.agent),
    );

    if (outOfScope) {
      return failResult(
        `Product ${outOfScope.productId} is not available in the agent's catalog scope`,
      );
    }

    try {
      const quote = await updateQuote(ctx.tenantId, args.quoteId, {
        customerId: ctx.customerId,
        items,
        validUntil:
          typeof args.validUntil === "string" ? args.validUntil : undefined,
      });

      return okResult(compactQuote(quote));
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Unable to update quote",
      );
    }
  },
};

export const quoteTools: AgentTool[] = [
  getQuotesTool,
  getQuoteStatusTool,
  createQuoteTool,
  updateQuoteTool,
];
