import { Types } from "mongoose";
import { CommercialPolicy } from "../models/CommercialPolicy.js";

export interface UpdateCommercialPolicyInput {
  paymentTerms?: string;
  discountPolicy?: string;
  shippingPolicy?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  notes?: string;
}

function assertValidTenantId(tenantId: string): void {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }
}

export async function getCommercialPolicy(tenantId: string) {
  assertValidTenantId(tenantId);

  return CommercialPolicy.findOne({
    tenantId,
  }).lean();
}

export async function updateCommercialPolicy(
  tenantId: string,
  input: UpdateCommercialPolicyInput,
) {
  assertValidTenantId(tenantId);

  const update: Record<string, unknown> = {};

  if (input.paymentTerms !== undefined) update.paymentTerms = input.paymentTerms;
  if (input.discountPolicy !== undefined)
    update.discountPolicy = input.discountPolicy;
  if (input.shippingPolicy !== undefined)
    update.shippingPolicy = input.shippingPolicy;
  if (input.warrantyPolicy !== undefined)
    update.warrantyPolicy = input.warrantyPolicy;
  if (input.returnPolicy !== undefined) update.returnPolicy = input.returnPolicy;
  if (input.notes !== undefined) update.notes = input.notes;

  const policy = await CommercialPolicy.findOneAndUpdate(
    {
      tenantId,
    },
    {
      $set: update,
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();

  if (!policy) {
    throw new Error("Commercial policy not found");
  }

  return policy;
}