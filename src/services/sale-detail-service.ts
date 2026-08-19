import { Types } from "mongoose";
import { Sale } from "../models/Sale.js";
import { SaleEvent } from "../models/SaleEvent.js";

export async function getSaleById(tenantId: string, saleId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid saleId");
  }

  const sale = await Sale.findOne({
    _id: saleId,
    tenantId: new Types.ObjectId(tenantId),
  }).lean();

  if (!sale) {
    throw new Error("Sale not found");
  }

  const events = await SaleEvent.find({
    saleId: sale._id,
    tenantId: new Types.ObjectId(tenantId),
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  return {
    sale,
    events,
  };
}
