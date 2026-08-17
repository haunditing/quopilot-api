import { Types } from "mongoose";
import { Sequence } from "../models/Sequence.js";

export async function getNextQuoteNumber(tenantId: string): Promise<string> {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const sequence = await Sequence.findOne({
    tenantId: new Types.ObjectId(tenantId),
    key: "QUOTE",
  }).lean();

  const nextValue = (sequence?.value ?? 0) + 1;

  return `Q-${String(nextValue).padStart(6, "0")}`;
}
