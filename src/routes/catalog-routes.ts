import { Router } from "express";
import { AppFeature } from "../models/AppFeature.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { syncCatalogManually } from "../services/feature-sync-service.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

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

router.post("/sync-catalog", async (_req, res) => {
  try {
    const result = await (await import("../services/feature-sync-service.js")).syncCatalogManually();
    res.status(200).json({
      message: "Catalog synchronized successfully",
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to synchronize catalog" });
  }
});

export default router;