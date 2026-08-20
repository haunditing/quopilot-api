import { AppFeature } from "../models/AppFeature.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { AppCapability } from "../models/AppCapability.js";
import { AppUsageLimit } from "../models/AppUsageLimit.js";
import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import { Plan } from "../models/Plan.js";
import {
  APP_FEATURES_REGISTRY,
  DEFAULT_APP_FEATURES_BY_PLAN,
} from "../registry/app-feature-registry.js";
import { APP_CAPABILITIES_REGISTRY } from "../registry/app-capability-registry.js";
import { APP_USAGE_LIMITS_REGISTRY } from "../registry/app-usage-limit-registry.js";
import {
  AI_TOOLS_REGISTRY,
  DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN,
} from "../registry/ai-tools-registry.js";
import { validateCatalogIntegrity } from "./capability-service.js";

async function upsertRegistry<T>(
  model: any,
  registry: T[],
  keyField: keyof T,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const entry of registry) {
    const key = entry[keyField] as string;
    const existing = await model.findOne({ [keyField]: key });
    if (existing) {
      await model.findOneAndUpdate(
        { [keyField]: key },
        { $set: { ...entry } },
        { runValidators: true },
      );
      updated++;
    } else {
      await model.create(entry);
      created++;
    }
  }

  return { created, updated };
}

async function migrateExistingPlansToExplicitCapabilities(): Promise<void> {
  const plans = await Plan.find();
  const catalog = APP_CAPABILITIES_REGISTRY.filter((c) => c.configurableByPlan);

  for (const plan of plans) {
    if (!plan.enabledCapabilities || plan.enabledCapabilities.length === 0) {
      const enabledFeatures = new Set(plan.enabledFeatures || []);
      const codesToMaterialize = catalog
        .filter((c) => enabledFeatures.has(c.module))
        .map((c) => c.code);

      if (codesToMaterialize.length > 0) {
        await Plan.updateOne(
          { _id: plan._id },
          { $set: { enabledCapabilities: codesToMaterialize } },
        );
      }
    }

    // Inicializar usageLimits si están vacíos con los valores por defecto del catálogo
    if (!plan.usageLimits || plan.usageLimits.length === 0) {
      const defaultUsageLimits = APP_USAGE_LIMITS_REGISTRY.map((ul) => ({
        code: ul.code,
        limit: ul.defaultValue,
      }));
      await Plan.updateOne(
        { _id: plan._id },
        { $set: { usageLimits: defaultUsageLimits } },
      );
    }
  }
}

async function syncDefaultCapabilitiesForPlans(): Promise<void> {
  const plans = await Plan.find().lean();

  for (const plan of plans) {
    const existingCaps = await AssistantPlanCapabilities.findOne({ planKey: plan.key });

    if (!existingCaps) {
      const caps = getDefaultCapabilitiesForPlan(plan.key);
      if (caps) {
        await AssistantPlanCapabilities.create({
          planKey: plan.key,
          toolPermissions: caps.map((c) => ({
            toolKey: c.toolKey,
            allowedActions: c.allowedActions,
            executionLevel: c.executionLevel,
            requiresConfirmation: c.requiresConfirmation,
          })),
          globalDefaults: {
            defaultExecutionLevel: "READ_ONLY",
            requireConfirmationFor: ["create", "modify", "delete", "execute"],
          },
        });
      }
    }
  }
}

function getDefaultCapabilitiesForPlan(planKey: string) {
  const caps = DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN[planKey];
  if (!caps) return null;

  return caps.map((c) => ({
    toolKey: c.toolKey,
    allowedActions: c.allowedActions,
    executionLevel: c.executionLevel,
    requiresConfirmation: c.requiresConfirmation,
  }));
}

export async function syncCatalogOnStartup(): Promise<void> {
  console.log("[FeatureSync] Starting catalog synchronization...");

  try {
    const features = await upsertRegistry(AppFeature, APP_FEATURES_REGISTRY, "key");
    const tools = await upsertRegistry(AIAssistantTool, AI_TOOLS_REGISTRY, "key");
    const capabilities = await upsertRegistry(AppCapability, APP_CAPABILITIES_REGISTRY, "code");
    const usageLimits = await upsertRegistry(AppUsageLimit, APP_USAGE_LIMITS_REGISTRY, "code");

    console.log(
      `[FeatureSync] Catalogs: Features(${features.created}), Tools(${tools.created}), Capabilities(${capabilities.created}), UsageLimits(${usageLimits.created})`,
    );

    await migrateExistingPlansToExplicitCapabilities();
    await syncDefaultCapabilitiesForPlans();

    const report = await validateCatalogIntegrity();
    if (!report.valid) {
      console.warn(`[FeatureSync] Catalog integrity issues: ${report.errors.length} errors.`);
    }

    console.log("[FeatureSync] Catalog synchronization completed successfully");
  } catch (error) {
    console.error("[FeatureSync] Error during catalog synchronization:", error);
    throw error;
  }
}

export async function syncCatalogManually(): Promise<{
  featuresCreated: number;
  featuresUpdated: number;
  toolsCreated: number;
  toolsUpdated: number;
  capabilitiesCreated: number;
  capabilitiesUpdated: number;
  usageLimitsCreated: number;
  usageLimitsUpdated: number;
}> {
  const features = await upsertRegistry(AppFeature, APP_FEATURES_REGISTRY, "key");
  const tools = await upsertRegistry(AIAssistantTool, AI_TOOLS_REGISTRY, "key");
  const capabilities = await upsertRegistry(AppCapability, APP_CAPABILITIES_REGISTRY, "code");
  const usageLimits = await upsertRegistry(AppUsageLimit, APP_USAGE_LIMITS_REGISTRY, "code");

  await migrateExistingPlansToExplicitCapabilities();
  await syncDefaultCapabilitiesForPlans();

  return {
    featuresCreated: features.created,
    featuresUpdated: features.updated,
    toolsCreated: tools.created,
    toolsUpdated: tools.updated,
    capabilitiesCreated: capabilities.created,
    capabilitiesUpdated: capabilities.updated,
    usageLimitsCreated: usageLimits.created,
    usageLimitsUpdated: usageLimits.updated,
  };
}
