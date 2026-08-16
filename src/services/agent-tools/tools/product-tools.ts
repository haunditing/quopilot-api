import { getProducts, getProductById } from "../../product-query-service.js";
import {
  failResult,
  isProductAllowed,
  normalizeLimit,
  okResult,
  type AgentTool,
  type AgentToolContext,
} from "../types.js";

interface ProductSummary {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  currency: string;
  description?: string;
}

export const searchProductsTool: AgentTool = {
  name: "searchProducts",
  description:
    "Busca productos del catálogo por nombre, SKU o descripción, con filtros opcionales de moneda y precio máximo. Respeta el alcance de catálogo configurado para el agente.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Texto de búsqueda en nombre, SKU o descripción",
      },
      currency: {
        type: "string",
        description: "Código de moneda, por ejemplo COP o USD",
      },
      maxPrice: {
        type: "number",
        description: "Precio máximo por unidad",
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

    const result = await getProducts({
      tenantId: ctx.tenantId,
      page: 1,
      limit,
      status: "ACTIVE",
      search: typeof args.search === "string" ? args.search : undefined,
      currency:
        typeof args.currency === "string" ? args.currency : undefined,
      maxPrice:
        typeof args.maxPrice === "number" ? args.maxPrice : undefined,
    });

    const products: ProductSummary[] = result.data
      .filter((product) =>
        isProductAllowed(product._id.toString(), ctx.agent),
      )
      .map((product) => ({
        id: product._id.toString(),
        name: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        currency: product.currency,
        description: product.description,
      }));

    return okResult({
      items: products,
      total: products.length,
    });
  },
};

export const getProductDetailsTool: AgentTool = {
  name: "getProductDetails",
  description:
    "Obtiene los detalles completos de un producto del catálogo por su ID. Respeta el alcance de catálogo configurado para el agente.",
  kind: "READ",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        description: "ID del producto",
      },
    },
    required: ["productId"],
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    if (typeof args.productId !== "string" || !args.productId.trim()) {
      return failResult("Invalid productId");
    }

    if (!isProductAllowed(args.productId, ctx.agent)) {
      return failResult(
        "Product not available in the agent's catalog scope",
      );
    }

    try {
      const product = await getProductById(
        ctx.tenantId,
        args.productId,
      );

      return okResult({
        id: product._id.toString(),
        name: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        currency: product.currency,
        description: product.description,
      });
    } catch (error) {
      return failResult(
        error instanceof Error ? error.message : "Product not found",
      );
    }
  },
};

export const productTools: AgentTool[] = [
  searchProductsTool,
  getProductDetailsTool,
];
