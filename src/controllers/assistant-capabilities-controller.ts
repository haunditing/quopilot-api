import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  getAssistantCapabilities,
  setCapabilitiesForPlan,
  updateFunctionalityCapabilities,
  deletePlanCapabilities,
} from "../services/assistant-capabilities-service.js";

export async function getAssistantCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const planKey = req.params.planKey;

  if (!planKey || typeof planKey !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    const capabilities = await getAssistantCapabilities(planKey);
    res.status(200).json(capabilities.functionalities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load assistant capabilities" });
  }
}

export async function updateAssistantCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const planKey = req.params.planKey;

  if (!planKey || typeof planKey !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  const { functionalities } = req.body;

  if (!Array.isArray(functionalities)) {
    res.status(400).json({ message: "Functionalities array required" });
    return;
  }

  try {
    await setCapabilitiesForPlan(planKey, functionalities);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update capabilities",
    });
  }
}

export async function updateFunctionalityCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const planKey = req.params.planKey;
  const functionalityKey = req.params.functionalityKey;

  if (!planKey || typeof planKey !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  if (!functionalityKey || typeof functionalityKey !== "string") {
    res.status(400).json({ message: "Functionality key required" });
    return;
  }

  const { capabilities } = req.body;

  if (!capabilities || typeof capabilities !== "object") {
    res.status(400).json({ message: "Capabilities object required" });
    return;
  }

  try {
    await (await import("../services/assistant-capabilities-service.js")).updateFunctionalityCapabilities(
      planKey,
      functionalityKey,
      capabilities,
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update functionality capabilities",
    });
  }
}

export async function deletePlanCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const planKey = req.params.planKey;

  if (!planKey || typeof planKey !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    await deletePlanCapabilities(planKey);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete plan capabilities",
    });
  }
}