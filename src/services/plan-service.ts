import { Plan } from "../models/Plan.js";
import { AppFeature } from "../models/AppFeature.js";

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

export async function getPlanEnabledFeatures(key: string): Promise<string[]> {
  const plan = await getPlanByKey(key);
  return plan?.enabledFeatures ?? [];
}

export async function isFeatureEnabled(planKey: string, featureKey: string): Promise<boolean> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return false;
  return plan.enabledFeatures.includes(featureKey);
}

export async function getFeatureConfig(planKey: string, featureKey: string): Promise<Record<string, unknown> | null> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return null;
  if (!plan.enabledFeatures.includes(featureKey)) return null;
  const feature = await AppFeature.findOne({ key: featureKey }).lean();
  return feature?.metadata ?? null;
}

export async function createPlan(input: {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  enabledFeatures?: string[];
  sortOrder?: number;
}) {
  const key = input.key.toUpperCase();

  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  // Validate features exist in AppFeature
  const validFeatures = input.enabledFeatures ? await validateFeatures(input.enabledFeatures) : [];

  const plan = await Plan.create({
    key,
    name: input.name,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    enabledFeatures: validFeatures,
    sortOrder: input.sortOrder ?? 0,
  });

  return plan.toObject();
}

export async function updatePlan(key: string, input: {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  enabledFeatures?: string[];
  sortOrder?: number;
}) {
  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  // Validate features if provided
  let validFeatures: string[] | undefined;
  if (input.enabledFeatures) {
    validFeatures = await validateFeatures(input.enabledFeatures);
    input = { ...input, enabledFeatures: validFeatures };
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

async function validateFeatures(featureKeys: string[]): Promise<string[]> {
  const features = await AppFeature.find({ key: { $in: featureKeys } }).lean();
  const validKeys = new Set(features.map((f) => f.key));
  return featureKeys.filter((k) => validKeys.has(k));
}