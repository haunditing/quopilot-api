import mongoose from "mongoose";
import { Quote } from "../models/Quote.js";
import { createQuoteEvent } from "./quote-event-service.js";

export async function sendQuote(tenantId: string, quoteId: string) {
  const session = await mongoose.startSession();

  try {
    let updatedQuote;

    await session.withTransaction(async () => {
      const quote = await Quote.findOne({
        _id: quoteId,
        tenantId,
      }).session(session);

      if (!quote) {
        throw new Error("Quote not found");
      }

      if (quote.status !== "DRAFT") {
        throw new Error(`Quote cannot be sent from status ${quote.status}`);
      }

      quote.status = "SENT";
      quote.sentAt = new Date();

      await quote.save({
        session,
      });

      await createQuoteEvent({
        tenantId,
        quoteId: quote._id.toString(),
        type: "SENT",
        session,
      });

      updatedQuote = quote;
    });

    if (!updatedQuote) {
      throw new Error("Unable to send quote");
    }

    return updatedQuote;
  } finally {
    await session.endSession();
  }
}
