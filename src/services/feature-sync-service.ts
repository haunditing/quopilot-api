import { AppFeature } from "../models/AppFeature.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import { Plan } from "../models/Plan.js";
import { APP_FEATURES_REGISTRY, DEFAULT_APP_FEATURES_BY_PLAN } from "../registry/app-feature-registry.js";
import {
  AI_TOOLS_REGISTRY,
  DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN,
} from "../registry/ai-tools-registry.js";

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
    let featuresCreated = 0;
    let featuresUpdated = 0;

    for (const feature of APP_FEATURES_REGISTRY) {
      const existing = await AppFeature.findOne({ key: feature.key });
      if (existing) {
        await AppFeature.findOneAndUpdate(
          { key: feature.key },
          { $set: { ...feature } },
          { runValidators: true }
        );
        featuresUpdated++;
      } else {
        await AppFeature.create(feature);
        featuresCreated++;
      }
    }
    console.log(`[FeatureSync] App Features: ${featuresCreated} created, ${featuresUpdated} updated`);

    // 2. Upsert AI Tools
    let toolsCreated = 0;
    let toolsUpdated = 0;

    for (const tool of AI_TOOLS_REGISTRY) {
      const existing = await AIAssistantTool.findOne({ key: tool.key });
      if (existing) {
        await AIAssistantTool.findOneAndUpdate(
          { key: tool.key },
          { $set: { ...tool } },
          { runValidators: true }
        );
        toolsUpdated++;
      } else {
        await AIAssistantTool.create(tool);
        toolsCreated++;
      }
    }
    console.log(`[FeatureSync] AI Tools: ${toolsCreated} created, ${toolsUpdated} updated`);

    // 3. Sync default capabilities for plans
    await syncDefaultCapabilitiesForPlans();
    console.log("[FeatureSync] Assistant capabilities synced for all plans");

    console.log("[FeatureSync] Catalog synchronization completed successfully");
  } catch (error) {
    console.error("[FeatureSync] Error during catalog synchronization:", error);
    throw error;
  }
}

export async function syncCatalogManually(): Promise<{ featuresCreated: number; featuresUpdated: number; toolsCreated: number; toolsUpdated: number }> {
  let featuresCreated = 0;
  let featuresUpdated = 0;
  let toolsCreated = 0;
  let toolsUpdated = 0;

  for (const feature of APP_FEATURES_REGISTRY) {
    const existing = await AppFeature.findOne({ key: feature.key });
    if (existing) {
      await AppFeature.findOneAndUpdate(
        { key: feature.key },
        { $set: { ...feature } },
        { runValidators: true }
      );
      featuresUpdated++;
    } else {
      await AppFeature.create(feature);
      featuresCreated++;
    }
  }

  for (const tool of AI_TOOLS_REGISTRY) {
    const existing = await AIAssistantTool.findOne({ key: tool.key });
    if (existing) {
      await AIAssistantTool.findOneAndUpdate(
        { key: tool.key },
        { $set: { ...tool } },
        { runValidators: true }
      );
      toolsUpdated++;
    } else {
      await AIAssistantTool.create(tool);
      toolsCreated++;
    }
  }

  await syncDefaultCapabilitiesForPlans();

  return { featuresCreated, featuresUpdated, toolsCreated, toolsUpdated };
}