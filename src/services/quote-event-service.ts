import { ClientSession } from "mongoose";
import { QuoteEvent, QuoteEventType } from "../models/QuoteEvent.js";

interface CreateQuoteEventInput {
  tenantId: string;
  quoteId: string;
  type: QuoteEventType;
  session?: ClientSession;
}

export async function createQuoteEvent(input: CreateQuoteEventInput) {
  const { tenantId, quoteId, type, session } = input;

  const [event] = await QuoteEvent.create(
    [
      {
        tenantId,
        quoteId,
        type,
      },
    ],
    session
      ? {
          session,
        }
      : undefined,
  );

  return event;
}
