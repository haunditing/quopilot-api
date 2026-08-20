import { AppFeature } from "../models/AppFeature.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { AppCapability } from "../models/AppCapability.js";
import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import { Plan } from "../models/Plan.js";
import { APP_FEATURES_REGISTRY, DEFAULT_APP_FEATURES_BY_PLAN } from "../registry/app-feature-registry.js";
import { APP_CAPABILITIES_REGISTRY } from "../registry/app-capability-registry.js";
import {
  AI_TOOLS_REGISTRY,
  DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN,
} from "../registry/ai-tools-registry.js";

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
        console.log(`Assistant capabilities for ${plan.key} created.`);
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
    // 1. Upsert App Features
    const features = await upsertRegistry(AppFeature, APP_FEATURES_REGISTRY, "key");
    console.log(
      `[FeatureSync] App Features: ${features.created} created, ${features.updated} updated`,
    );

    // 2. Upsert AI Tools
    const tools = await upsertRegistry(AIAssistantTool, AI_TOOLS_REGISTRY, "key");
    console.log(
      `[FeatureSync] AI Tools: ${tools.created} created, ${tools.updated} updated`,
    );

    // 3. Upsert App Capabilities (inventario maestro atomizado)
    const capabilities = await upsertRegistry(AppCapability, APP_CAPABILITIES_REGISTRY, "code");
    console.log(
      `[FeatureSync] App Capabilities: ${capabilities.created} created, ${capabilities.updated} updated`,
    );

    // 4. Sync default capabilities for plans
    await syncDefaultCapabilitiesForPlans();
    console.log("[FeatureSync] Assistant capabilities synced for all plans");

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
}> {
  const features = await upsertRegistry(AppFeature, APP_FEATURES_REGISTRY, "key");
  const tools = await upsertRegistry(AIAssistantTool, AI_TOOLS_REGISTRY, "key");
  const capabilities = await upsertRegistry(AppCapability, APP_CAPABILITIES_REGISTRY, "code");

  await syncDefaultCapabilitiesForPlans();

  return {
    featuresCreated: features.created,
    featuresUpdated: features.updated,
    toolsCreated: tools.created,
    toolsUpdated: tools.updated,
    capabilitiesCreated: capabilities.created,
    capabilitiesUpdated: capabilities.updated,
  };
}