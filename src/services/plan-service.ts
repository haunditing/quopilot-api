import { Types } from "mongoose";
import { Plan } from "../models/Plan.js";
import { Tenant } from "../models/Tenant.js";
import { AppFeature } from "../models/AppFeature.js";
import { AppCapability } from "../models/AppCapability.js";
import {
  DEFAULT_APP_FEATURES_BY_PLAN,
  DEFAULT_APP_CAPABILITIES_BY_PLAN,
} from "../registry/app-feature-registry.js";
import type { UpdatePlanInput } from "../schemas/plan-schema.js";

export class PlanNotFoundError extends Error {
  constructor(message = "Plan not found") {
    super(message);
    this.name = "PlanNotFoundError";
  }
}

type PlanIdentifier = string;

/** Filtro común para archivar: por defecto se excluyen los archivados. */
function archivedFilter(includeArchived: boolean): Record<string, unknown> {
  return includeArchived ? {} : { deletedAt: null };
}

/**
 * Resuelve un identificador de plan que puede ser un `_id` de Mongo o un
 * `key` (código). Permite que la API acepte `/plans/:id` y `/plans/:key`.
 */
function planFilter(
  identifier: string,
  includeArchived = false,
): Record<string, unknown> {
  const archived = archivedFilter(includeArchived);
  if (Types.ObjectId.isValid(identifier)) {
    return { ...archived, _id: new Types.ObjectId(identifier) };
  }
  return { ...archived, key: identifier.toUpperCase() };
}

/** Lista planes excluyendo los archivados (a menos que se pida incluirlos). */
export async function listPlans(
  options: { includeArchived?: boolean } = {},
) {
  const filter = archivedFilter(options.includeArchived ?? false);
  return Plan.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
}

export async function listActivePlans() {
  return Plan.find({ deletedAt: null, isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
}

export async function getPlanByKey(
  key: string,
  options: { includeArchived?: boolean } = {},
) {
  return Plan.findOne({
    ...archivedFilter(options.includeArchived ?? false),
    key: key.toUpperCase(),
  }).lean();
}

export async function getPlanByIdentifier(
  identifier: string,
  options: { includeArchived?: boolean } = {},
) {
  return Plan.findOne(planFilter(identifier, options.includeArchived ?? false)).lean();
}

export async function getDefaultPlan() {
  return Plan.findOne({ isDefault: true, isActive: true, deletedAt: null }).lean();
}

export async function getPlanEnabledFeatures(key: string): Promise<string[]> {
  const plan = await getPlanByKey(key);
  return plan?.enabledFeatures ?? [];
}

export async function getPlanEnabledCapabilities(key: string): Promise<string[]> {
  const plan = await getPlanByKey(key);
  return plan?.enabledCapabilities ?? [];
}

export async function isFeatureEnabled(
  planKey: string,
  featureKey: string,
): Promise<boolean> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return false;
  return plan.enabledFeatures.includes(featureKey);
}

export async function getFeatureConfig(
  planKey: string,
  featureKey: string,
): Promise<Record<string, unknown> | null> {
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
  enabledCapabilities?: string[];
  usageLimits?: { code: string; limit: number }[];
  sortOrder?: number;
}) {
  const key = input.key.toUpperCase();

  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const featuresToValidate =
    input.enabledFeatures ?? DEFAULT_APP_FEATURES_BY_PLAN[key] ?? [];
  const capabilitiesToValidate =
    input.enabledCapabilities ?? DEFAULT_APP_CAPABILITIES_BY_PLAN[key] ?? [];

  const validFeatures = await validateFeatures(featuresToValidate);
  const validCapabilities = await validateCapabilities(capabilitiesToValidate);

  const plan = await Plan.create({
    key,
    name: input.name,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    enabledFeatures: validFeatures,
    enabledCapabilities: validCapabilities,
    usageLimits: input.usageLimits ?? [],
    sortOrder: input.sortOrder ?? 0,
    deletedAt: null,
  });

  return plan.toObject();
}

/**
 * Actualiza un plan por `_id` o `key`.
 * El campo `code`/`key` es INMUTABLE tras la creación: cualquier valor
 * enviado se descarta (se ignora) y no forma parte del `$set`.
 */
export async function updatePlan(identifier: string, input: UpdatePlanInput) {
  // Descarta campos inmutables o de metadatos.
  const clean = { ...input };
  delete (clean as Record<string, unknown>).key;
  delete (clean as Record<string, unknown>).code;
  delete (clean as Record<string, unknown>)._id;
  delete (clean as Record<string, unknown>).id;
  delete (clean as Record<string, unknown>).createdAt;
  delete (clean as Record<string, unknown>).updatedAt;
  delete (clean as Record<string, unknown>).deletedAt;

  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  // Validar features si se proveen
  if (clean.enabledFeatures) {
    clean.enabledFeatures = await validateFeatures(clean.enabledFeatures);
  }

  // Validar capabilities si se proveen
  if (clean.enabledCapabilities) {
    clean.enabledCapabilities = await validateCapabilities(clean.enabledCapabilities);
  }

  const plan = await Plan.findOneAndUpdate(
    planFilter(identifier),
    { $set: clean },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!plan) {
    throw new PlanNotFoundError();
  }

  return plan;
}

export interface DeletePlanResult {
  archived: boolean;
  warning?: {
    message: string;
    code: string;
    activeTenants: number;
  };
}

/**
 * Eliminación lógica (Soft Delete): marca `deletedAt` y `isActive=false`.
 * Si el plan tiene tenants activos, se archiva igualmente pero se devuelve
 * una advertencia para que la UI informe que seguirá disponible para esos
 * usuarios.
 */
export async function deletePlan(identifier: string): Promise<DeletePlanResult> {
  const plan = await Plan.findOne(planFilter(identifier)).lean();

  if (!plan) {
    throw new PlanNotFoundError();
  }

  let activeTenants = 0;
  try {
    activeTenants = await Tenant.countDocuments({
      plan: plan.key,
      status: "ACTIVE",
    });
  } catch {
    // Si la colección de tenants no responde, se archiva sin advertencia.
  }

  const now = new Date();
  await Plan.updateOne(
    { _id: plan._id },
    { $set: { deletedAt: now, isActive: false } },
  );

  const warning =
    activeTenants > 0
      ? {
          message: `Este plan tiene ${activeTenants} tenant(s) activo(s). Se archivará pero seguirá disponible para los usuarios actuales.`,
          code: "PLAN_HAS_ACTIVE_TENANTS",
          activeTenants,
        }
      : undefined;

  return { archived: true, warning };
}

export async function setDefaultPlan(identifier: string) {
  await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  const plan = await Plan.findOneAndUpdate(
    planFilter(identifier),
    { $set: { isDefault: true } },
    { returnDocument: "after" },
  ).lean();

  if (!plan) {
    throw new PlanNotFoundError();
  }

  return plan;
}

async function validateFeatures(featureKeys: string[]): Promise<string[]> {
  const features = await AppFeature.find({ key: { $in: featureKeys } }).lean();
  const validKeys = new Set(features.map((f) => f.key));
  return featureKeys.filter((k) => validKeys.has(k));
}

async function validateCapabilities(capabilityCodes: string[]): Promise<string[]> {
  const capabilities = await AppCapability.find({
    code: { $in: capabilityCodes },
    isActive: true,
  }).lean();

  const capabilityMap = new Map(capabilities.map((c) => [c.code, c]));

  const validConfigurableCodes = capabilityCodes.filter((code) => {
    const cap = capabilityMap.get(code);
    return cap && cap.configurableByPlan;
  });

  const uniqueCodes = [...new Set(validConfigurableCodes)];
  const codesSet = new Set(uniqueCodes);

  for (const code of uniqueCodes) {
    const cap = capabilityMap.get(code);
    if (cap && cap.dependencies) {
      for (const dep of cap.dependencies) {
        if (dep.type === "OBLIGATORIA" && !codesSet.has(dep.code)) {
          const depCap = await AppCapability.findOne({ code: dep.code }).lean();
          if (!depCap || depCap.configurableByPlan) {
            throw new Error(
              `Integridad de plan: la capacidad "${code}" requiere "${dep.code}" (OBLIGATORIA)`,
            );
          }
        }
      }
    }
  }

  return uniqueCodes;
}
