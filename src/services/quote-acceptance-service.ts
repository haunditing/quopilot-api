import mongoose from "mongoose";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { getNextSequence } from "./sequence-service.js";
import { createQuoteEvent } from "./quote-event-service.js";

export async function acceptQuote(tenantId: string, quoteId: string) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const quote = await Quote.findOne({
        _id: quoteId,
        tenantId,
      }).session(session);

      if (!quote) {
        throw new Error("Quote not found");
      }

      if (quote.status === "ACCEPTED") {
        let sale = await Sale.findOne({ quoteId: quote._id }).session(session);
        if (!sale) {
          const saleSequence = await getNextSequence(tenantId, "SALE");
          const saleNumber = `S-${String(saleSequence).padStart(6, "0")}`;
          [sale] = await Sale.create(
            [
              {
                tenantId: quote.tenantId,
                customerId: quote.customerId,
                quoteId: quote._id,
                number: saleNumber,
                total: quote.total,
                currency: quote.currency,
                status: "CONFIRMED",
                soldAt: new Date(),
              },
            ],
            { session },
          );
        }
        return { quote, sale };
      }

      if (quote.status !== "SENT" && quote.status !== "VIEWED") {
        throw new Error(`Quote cannot be accepted from status ${quote.status}`);
      }

      quote.status = "ACCEPTED";
      quote.acceptedAt = new Date();

      await quote.save({ session });

      await createQuoteEvent({
        tenantId,
        quoteId: quote._id.toString(),
        type: "ACCEPTED",
        session,
      });

      const saleSequence = await getNextSequence(tenantId, "SALE");

      const saleNumber = `S-${String(saleSequence).padStart(6, "0")}`;

      const [sale] = await Sale.create(
        [
          {
            tenantId: quote.tenantId,
            customerId: quote.customerId,
            quoteId: quote._id,
            number: saleNumber,
            total: quote.total,
            currency: quote.currency,
            status: "CONFIRMED",
            soldAt: new Date(),
          },
        ],
        { session },
      );

      return {
        quote,
        sale,
      };
    });
  } finally {
    await session.endSession();
  }
}
