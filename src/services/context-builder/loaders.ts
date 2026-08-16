import { Types } from "mongoose";
import { Tenant } from "../../models/Tenant.js";
import { Customer } from "../../models/Customer.js";
import { Conversation } from "../../models/Conversation.js";
import { CommercialPolicy } from "../../models/CommercialPolicy.js";
import { ConversationState } from "../../models/ConversationState.js";
import { Product } from "../../models/Product.js";
import { Quote } from "../../models/Quote.js";
import { Sale } from "../../models/Sale.js";
import { getProducts } from "../product-query-service.js";
import { getQuotes } from "../quote-query-service.js";
import { getSales } from "../sale-query-service.js";
import {
  CONTEXT_LIMITS,
  type AgentContextProfile,
  type CommercialPolicyProfile,
  type ContextTrigger,
  type ConversationContextProfile,
  type CustomerContextProfile,
  type CustomerHistoryProfile,
  type ProductContextItem,
  type QuoteContextItem,
  type SaleContextItem,
  type TenantContextProfile,
} from "./types.js";

export interface AlwaysOnData {
  tenant: TenantContextProfile | null;
  customer: CustomerContextProfile | null;
  conversation: ConversationContextProfile | null;
  policy: CommercialPolicyProfile | null;
  summary: string;
}

export interface OnDemandData {
  products: ProductContextItem[];
  quotes: QuoteContextItem[];
  sales: SaleContextItem[];
}

export async function loadAlwaysOnData(
  tenantId: string,
  conversationId: string,
  customerId: string,
): Promise<AlwaysOnData> {
  const [tenant, customer, conversation, policy, state] = await Promise.all([
    Tenant.findOne({
      _id: tenantId,
    }).lean(),
    Customer.findOne({
      _id: customerId,
      tenantId,
    }).lean(),
    Conversation.findOne({
      _id: conversationId,
      tenantId,
    }).lean(),
    CommercialPolicy.findOne({
      tenantId,
    }).lean(),
    ConversationState.findOne({
      tenantId,
      conversationId,
    }).lean(),
  ]);

  return {
    tenant: tenant
      ? {
          name: tenant.name,
          legalName: tenant.legalName,
          currency: tenant.currency,
          country: tenant.country,
          timezone: tenant.timezone,
        }
      : null,
    customer: customer
      ? {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          country: customer.country,
        }
      : null,
    conversation: conversation
      ? {
          channel: conversation.channel,
          status: conversation.status,
        }
      : null,
    policy: policy
      ? {
          paymentTerms: policy.paymentTerms,
          discountPolicy: policy.discountPolicy,
          shippingPolicy: policy.shippingPolicy,
          warrantyPolicy: policy.warrantyPolicy,
          returnPolicy: policy.returnPolicy,
          notes: policy.notes,
        }
      : null,
    summary: state?.summary ?? "",
  };
}

function mapProducts(
  items: Array<{
    _id: Types.ObjectId;
    name: string;
    sku?: string;
    unitPrice: number;
    currency: string;
    description?: string;
  }>,
): ProductContextItem[] {
  return items.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    sku: product.sku,
    unitPrice: product.unitPrice,
    currency: product.currency,
    description: product.description,
  }));
}

async function loadProducts(
  tenantId: string,
  agent: AgentContextProfile,
  search?: string,
): Promise<ProductContextItem[]> {
  const limit = CONTEXT_LIMITS.maxProducts;

  if (
    agent.productScope === "SELECTED" &&
    agent.allowedProductIds?.length
  ) {
    const ids = agent.allowedProductIds
      .filter((id) => Types.ObjectId.isValid(id))
      .slice(0, limit)
      .map((id) => new Types.ObjectId(id));

    const products = await Product.find({
      tenantId,
      _id: {
        $in: ids,
      },
      status: "ACTIVE",
    })
      .sort({
        createdAt: 1,
      })
      .limit(limit)
      .lean();

    return mapProducts(products);
  }

  const result = await getProducts({
    tenantId,
    page: 1,
    limit,
    search: search?.trim() || undefined,
  });

  if (result.data.length > 0 || !search?.trim()) {
    return mapProducts(result.data);
  }

  const fallback = await getProducts({
    tenantId,
    page: 1,
    limit,
  });

  return mapProducts(fallback.data);
}

async function loadQuotes(
  tenantId: string,
  customerId: string,
): Promise<QuoteContextItem[]> {
  const result = await getQuotes({
    tenantId,
    customerId,
    page: 1,
    limit: CONTEXT_LIMITS.maxQuotes,
  });

  return result.data.map((quote) => ({
    id: quote._id.toString(),
    number: quote.number,
    status: quote.status,
    total: quote.total,
    currency: quote.currency,
    createdAt: quote.createdAt.toISOString(),
    items: quote.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }));
}

async function loadSales(
  tenantId: string,
  customerId: string,
): Promise<SaleContextItem[]> {
  const result = await getSales({
    tenantId,
    customerId,
    page: 1,
    limit: CONTEXT_LIMITS.maxSales,
    status: "CONFIRMED",
  });

  return result.data.map((sale) => ({
    id: sale._id.toString(),
    number: sale.number,
    total: sale.total,
    currency: sale.currency,
    soldAt: sale.soldAt.toISOString(),
  }));
}

export interface LoadOnDemandDataInput {
  tenantId: string;
  customerId: string;
  agent: AgentContextProfile;
  triggers: ContextTrigger[];
  search?: string;
}

export async function loadOnDemandData(
  input: LoadOnDemandDataInput,
): Promise<OnDemandData> {
  const { tenantId, customerId, agent, triggers, search } = input;

  const wantsProducts = triggers.includes("PRODUCT");
  const wantsQuotes =
    triggers.includes("QUOTE") || triggers.includes("CUSTOMER_HISTORY");
  const wantsSales =
    triggers.includes("SALE") || triggers.includes("CUSTOMER_HISTORY");

  const [products, quotes, sales] = await Promise.all([
    wantsProducts
      ? loadProducts(tenantId, agent, search)
      : Promise.resolve([]),
    wantsQuotes ? loadQuotes(tenantId, customerId) : Promise.resolve([]),
    wantsSales ? loadSales(tenantId, customerId) : Promise.resolve([]),
  ]);

  return {
    products,
    quotes,
    sales,
  };
}

export async function loadCustomerHistory(
  tenantId: string,
  customerId: string,
): Promise<CustomerHistoryProfile> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const customerObjectId = new Types.ObjectId(customerId);

  const [sales, openQuotes] = await Promise.all([
    Sale.aggregate<{
      count: number;
      total: number;
      last: Date | null;
    }>([
      {
        $match: {
          tenantId: tenantObjectId,
          customerId: customerObjectId,
          status: "CONFIRMED",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
          total: {
            $sum: "$total",
          },
          last: {
            $max: "$soldAt",
          },
        },
      },
    ]),
    Quote.countDocuments({
      tenantId: tenantObjectId,
      customerId: customerObjectId,
      status: {
        $in: ["DRAFT", "SENT", "VIEWED"],
      },
    }),
  ]);

  const row = sales[0];

  return {
    totalSales: row?.count ?? 0,
    totalSpent: row?.total ?? 0,
    lastPurchaseAt: row?.last ? row.last.toISOString() : undefined,
    openQuotes,
  };
}

export function extractProductSearch(message: string): string | undefined {
  const cleaned = message
    .replace(
      /(quiero|busco|necesito|dame|muestra|muéstrame|precio de|cu[aá]nto cuesta|informaci[oó]n|producto|productos|puedes|me)/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}
