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

/**
 * Alias compatibles: el asistente interno y el generador de propuestas
 * consumen una política de comercial con alcance de tenant. La política real
 * es de plataforma; se reutiliza la misma (sin filtrar por tenant) para que
 * el build y el runtime funcionen de forma consistente.
 */
export type UpdateCommercialPolicyInput = {
  trialDays?: number;
  trialPlanKey?: string;
  allowedBillingPeriods?: string[];
  gracePeriodDays?: number;
  allowImmediateCancellation?: boolean;
  cancelAtPeriodEndByDefault?: boolean;
  paymentTerms?: string;
  discountPolicy?: string;
  shippingPolicy?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  notes?: string;
};

export async function getCommercialPolicy(_tenantId?: string) {
  return getPlatformCommercialPolicy();
}

export async function updateCommercialPolicy(
  _tenantId: string,
  input: UpdateCommercialPolicyInput,
) {
  return updatePlatformCommercialPolicy(input);
}
