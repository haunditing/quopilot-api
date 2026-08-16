import { Types } from "mongoose";
import { Quote } from "../models/Quote.js";
import { QuoteEvent } from "../models/QuoteEvent.js";

export async function getQuoteById(tenantId: string, quoteId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(quoteId)) {
    throw new Error("Invalid quoteId");
  }

  const quote = await Quote.findOne({
    _id: quoteId,
    tenantId: new Types.ObjectId(tenantId),
  }).lean();

  if (!quote) {
    throw new Error("Quote not found");
  }

  const events = await QuoteEvent.find({
    quoteId: quote._id,
    tenantId: new Types.ObjectId(tenantId),
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  return {
    quote,
    events,
  };
}
