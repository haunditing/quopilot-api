import { Plan } from "../models/Plan.js";
import type { PlanAppFeature } from "../models/Plan.js";

export async function listPlans() {
  return Plan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
}

export async function listActivePlans() {
  return Plan.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
}

export async function getPlanByKey(key: string) {
  return Plan.findOne({ key: key.toUpperCase() }).lean();
}

export async function getDefaultPlan() {
  return Plan.findOne({ isDefault: true, isActive: true }).lean();
}

export async function getPlanFeatures(key: string) {
  const plan = await getPlanByKey(key);
  return plan?.features ?? [];
}

export async function isFeatureEnabled(planKey: string, featureKey: string): Promise<boolean> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return false;
  const feature = plan.features.find((f) => f.key === featureKey);
  return feature?.enabled ?? false;
}

export async function getFeatureConfig(planKey: string, featureKey: string): Promise<Record<string, unknown> | null> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return null;
  const feature = plan.features.find((f) => f.key === featureKey);
  return feature?.config ?? null;
}

export async function createPlan(input: {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  features?: Array<{ key: string; label: string; description?: string; enabled?: boolean; config?: Record<string, unknown> }>;
  sortOrder?: number;
}) {
  const key = input.key.toUpperCase();

  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const plan = await Plan.create({
    key,
    name: input.name,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    features: input.features ?? [],
    sortOrder: input.sortOrder ?? 0,
  });

  return plan.toObject();
}

export async function updatePlan(key: string, input: {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  features?: Array<{ key: string; label: string; description?: string; enabled?: boolean; config?: Record<string, unknown> }>;
  sortOrder?: number;
}) {
  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const plan = await Plan.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return plan;
}

export async function deletePlan(key: string) {
  const plan = await Plan.findOneAndDelete({ key: key.toUpperCase() }).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return { id: key };
}

export async function setDefaultPlan(key: string) {
  await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  const plan = await Plan.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: { isDefault: true } },
    { returnDocument: "after" },
  ).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return plan;
}