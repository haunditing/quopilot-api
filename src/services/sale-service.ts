import mongoose, { Types } from "mongoose";
import { Sale } from "../models/Sale.js";
import { createSaleEvent } from "./sale-event-service.js";

export async function deleteSale(tenantId: string, saleId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid saleId");
  }

  const session = await mongoose.startSession();

  try {
    let deletedSale;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: saleId,
        tenantId,
      }).session(session);

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status !== "CANCELLED") {
        throw new Error("Only cancelled sales can be deleted");
      }

      await Sale.deleteOne({
        _id: sale._id,
        tenantId,
      }).session(session);

      deletedSale = sale;
    });

    return deletedSale;
  } finally {
    await session.endSession();
  }
}

export async function cancelSale(tenantId: string, saleId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid saleId");
  }

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

      if (sale.status !== "CONFIRMED") {
        throw new Error(`Sale cannot be cancelled from status ${sale.status}`);
      }

      sale.status = "CANCELLED";

      await sale.save({ session });

      await createSaleEvent({
        tenantId,
        saleId: sale._id.toString(),
        type: "CANCELLED",
        session,
      });

      updatedSale = sale;
    });

    if (!updatedSale) {
      throw new Error("Unable to cancel sale");
    }

    return updatedSale;
  } finally {
    await session.endSession();
  }
}