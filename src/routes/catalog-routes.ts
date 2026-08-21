import { Router } from "express";
import { AppFeature } from "../models/AppFeature.js";
import { AppCapability } from "../models/AppCapability.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { syncCatalogManually } from "../services/feature-sync-service.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { getCapabilitiesReport } from "../capabilities/index.js";

import "../capabilities/catalog.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/features", async (_req, res) => {
  try {
    const features = await AppFeature.find({ isActive: true })
      .sort({ category: 1, sortOrder: 1 })
      .lean();
    res.status(200).json(features);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load features" });
  }
});

router.get("/ai-tools", async (_req, res) => {
  try {
    const tools = await (await import("../models/AIAssistantTool.js")).AIAssistantTool.find({ isActive: true })
      .sort({ category: 1, sortOrder: 1 })
      .lean();
    res.status(200).json(tools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load AI tools" });
  }
});

router.get("/capabilities", async (_req, res) => {
  try {
    const capabilities = await AppCapability.find({ isActive: true })
      .sort({ module: 1, sortOrder: 1 })
      .lean();
    res.status(200).json(capabilities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load capabilities" });
  }
});

router.get("/usage-limits", async (_req, res) => {
  try {
    const limits = await (await import("../models/AppUsageLimit.js")).AppUsageLimit.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
    res.status(200).json(limits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load usage limits catalog" });
  }
});

router.post("/sync-catalog", async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true";
    const result = await (await import("../services/feature-sync-service.js")).syncCatalogManually({ dryRun });

    // Respuesta plana retrocompatible + detalle de reconciliación.
    res.status(200).json({
      message: dryRun
        ? "Catalog reconciliation preview (dry run, nothing written)"
        : "Catalog synchronized successfully",
      featuresCreated: result.features.added,
      featuresUpdated: result.features.updated,
      toolsCreated: result.tools.added,
      toolsUpdated: result.tools.updated,
      capabilitiesCreated: result.capabilities.added,
      capabilitiesUpdated: result.capabilities.updated,
      usageLimitsCreated: result.usageLimits.added,
      usageLimitsUpdated: result.usageLimits.updated,
      dynamicNewCapabilities: result.capabilities.added,
      dynamicUpdatedCapabilities: result.capabilities.updated,
      dynamicTotalDetected: getCapabilitiesReport().totalCapabilities,
      detail: {
        dryRun: result.dryRun,
        features: result.features,
        capabilities: result.capabilities,
        tools: result.tools,
        usageLimits: result.usageLimits,
        pruning: result.pruning,
        integrity: {
          valid: result.integrity.valid,
          errorCount: result.integrity.errors.length,
          warningCount: result.integrity.warnings.length,
          errors: result.integrity.errors,
          warnings: result.integrity.warnings,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to synchronize catalog" });
  }
});

export default router;