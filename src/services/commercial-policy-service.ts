import { PlatformCommercialPolicy, IPlatformCommercialPolicy } from "../models/PlatformCommercialPolicy.js";

export async function getPlatformCommercialPolicy(): Promise<IPlatformCommercialPolicy> {
  let policy = await PlatformCommercialPolicy.findOne().lean();
  if (!policy) {
    const created = await PlatformCommercialPolicy.create({
      trialDays: 14,
      trialPlanKey: "PRO",
      allowedBillingPeriods: ["MONTHLY", "YEARLY"],
      gracePeriodDays: 7,
      allowImmediateCancellation: true,
      cancelAtPeriodEndByDefault: true,
    });
    return created.toObject() as IPlatformCommercialPolicy;
  }
  return policy as unknown as IPlatformCommercialPolicy;
}

export async function updatePlatformCommercialPolicy(input: {
  trialDays?: number;
  trialPlanKey?: string;
  allowedBillingPeriods?: string[];
  gracePeriodDays?: number;
  allowImmediateCancellation?: boolean;
  cancelAtPeriodEndByDefault?: boolean;
}): Promise<IPlatformCommercialPolicy> {
  let policy = await PlatformCommercialPolicy.findOne();
  if (!policy) {
    policy = new PlatformCommercialPolicy(input);
  } else {
    Object.assign(policy, input);
  }
  await policy.save();
  return policy.toObject();
}
