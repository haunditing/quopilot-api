import mongoose from "mongoose";
import { Sale } from "../models/Sale.js";
import { createSaleEvent } from "./sale-event-service.js";

export async function sendSale(tenantId: string, saleId: string) {
  const session = await mongoose.startSession();

  try {
    let updatedSale;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: saleId,
        tenantId,
      }).session(session);

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status !== "DRAFT") {
        throw new Error(`Sale cannot be sent from status ${sale.status}`);
      }

      sale.status = "SENT";
      sale.sentAt = new Date();

      await sale.save({
        session,
      });

      await createSaleEvent({
        tenantId,
        saleId: sale._id.toString(),
        type: "SENT",
        session,
      });

      updatedSale = sale;
    });

    if (!updatedSale) {
      throw new Error("Unable to send sale");
    }

    return updatedSale;
  } finally {
    await session.endSession();
  }
}
