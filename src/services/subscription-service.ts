import { Subscription, SubscriptionStatus, BillingPeriod } from "../models/Subscription.js";
import { Tenant } from "../models/Tenant.js";
import { getPlatformCommercialPolicy } from "./commercial-policy-service.js";

export async function getSubscriptionByTenantId(tenantId: string) {
  return Subscription.findOne({ tenantId }).lean();
}

export async function createSubscriptionForTenant(
  tenantId: string,
  initialPlanKey?: string,
  billingPeriod: BillingPeriod = "MONTHLY",
) {
  const policy = await getPlatformCommercialPolicy();
  const planKey = (initialPlanKey ?? policy.trialPlanKey).toUpperCase();

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + policy.trialDays * 24 * 60 * 60 * 1000);
  
  const periodEnd = new Date(now);
  if (billingPeriod === "YEARLY") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        tenantId,
        planKey,
        status: policy.trialDays > 0 ? "TRIAL" : "ACTIVE",
        billingPeriod,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: policy.trialDays > 0 ? trialEndsAt : undefined,
        cancelAtPeriodEnd: false,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();

  // Sync tenant plan
  await Tenant.findByIdAndUpdate(tenantId, { $set: { plan: planKey } });

  return subscription;
}

export async function changeTenantSubscriptionPlan(
  tenantId: string,
  newPlanKey: string,
) {
  const upperPlan = newPlanKey.toUpperCase();
  const sub = await Subscription.findOne({ tenantId });
  if (!sub) {
    throw new Error("Subscription not found for tenant");
  }

  sub.planKey = upperPlan;
  await sub.save();

  // Sync tenant plan (Graceful Degradation: data is preserved, creation checked by usage limits)
  await Tenant.findByIdAndUpdate(tenantId, { $set: { plan: upperPlan } });

  return sub.toObject();
}

export async function cancelTenantSubscription(
  tenantId: string,
  immediate = false,
) {
  const sub = await Subscription.findOne({ tenantId });
  if (!sub) {
    throw new Error("Subscription not found");
  }

  const now = new Date();
  if (immediate) {
    sub.status = "CANCELLED";
    sub.canceledAt = now;
  } else {
    sub.cancelAtPeriodEnd = true;
  }

  await sub.save();
  return sub.toObject();
}

export async function updateSubscriptionStatus(
  tenantId: string,
  status: SubscriptionStatus,
) {
  const sub = await Subscription.findOneAndUpdate(
    { tenantId },
    { $set: { status } },
    { returnDocument: "after" },
  ).lean();

  if (!sub) {
    throw new Error("Subscription not found");
  }

  return sub;
}
