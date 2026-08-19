import { ClientSession } from "mongoose";
import { SaleEvent, SaleEventType } from "../models/SaleEvent.js";

interface CreateSaleEventInput {
  tenantId: string;
  saleId: string;
  type: SaleEventType;
  session?: ClientSession;
}

export async function createSaleEvent(input: CreateSaleEventInput) {
  const { tenantId, saleId, type, session } = input;

  const [event] = await SaleEvent.create(
    [
      {
        tenantId,
        saleId,
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
