import { Types } from "mongoose";
import { Quote } from "../models/Quote.js";
import { QuoteEvent } from "../models/QuoteEvent.js";

interface GetQuotesInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: string;
  customerId?: string;
  search?: string;
}

export async function getQuotes(input: GetQuotesInput) {
  const { tenantId, page, limit, status, customerId, search } = input;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (customerId && !Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
  };

  if (status) {
    filter.status = status;
  }

  if (customerId) {
    filter.customerId = new Types.ObjectId(customerId);
  }

  if (search?.trim()) {
    filter.number = new RegExp(search.trim(), "i");
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Quote.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Quote.countDocuments(filter),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getQuoteStatus(tenantId: string, quoteId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(quoteId)) {
    throw new Error("Invalid quoteId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const quote = await Quote.findOne({
    _id: new Types.ObjectId(quoteId),
    tenantId: tenantObjectId,
  }).lean();

  if (!quote) {
    throw new Error("Quote not found");
  }

  const lastEvent = await QuoteEvent.findOne({
    quoteId: quote._id,
    tenantId: tenantObjectId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  return {
    number: quote.number,
    status: quote.status,
    subtotal: quote.subtotal,
    total: quote.total,
    currency: quote.currency,
    validUntil: quote.validUntil,
    sentAt: quote.sentAt,
    viewedAt: quote.viewedAt,
    acceptedAt: quote.acceptedAt,
    rejectedAt: quote.rejectedAt,
    lastEventType: lastEvent?.type,
    lastEventAt: lastEvent?.createdAt,
  };
}
