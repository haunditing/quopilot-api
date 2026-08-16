import { Types } from "mongoose";
import { Sale } from "../models/Sale.js";

function assertValidId(id: string, field = "id"): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}`);
  }
}

export async function deleteSale(tenantId: string, saleId: string) {
  assertValidId(tenantId, "tenantId");
  assertValidId(saleId, "saleId");

  const sale = await Sale.findOneAndDelete({
    _id: new Types.ObjectId(saleId),
    tenantId: new Types.ObjectId(tenantId),
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  return {
    id: saleId,
  };
}
