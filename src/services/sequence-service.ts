import { ClientSession, Types } from "mongoose";
import { Sequence } from "../models/Sequence.js";

export async function getNextSequence(
  tenantId: string,
  key: string,
  session?: ClientSession,
): Promise<number> {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const sequence = await Sequence.findOneAndUpdate(
    {
      tenantId,
      key,
    },
    {
      $inc: {
        value: 1,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      ...(session ? { session } : {}),
    },
  );

  if (!sequence) {
    throw new Error("Unable to generate sequence");
  }

  return sequence.value;
}
