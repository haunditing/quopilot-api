import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  getAssistantCapabilities,
  getToolPermissionsForPlan,
  getExecutionLevel,
  setCapabilitiesForPlan,
  updateToolPermission,
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
    res.status(200).json(capabilities.toolPermissions);
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

  const { toolPermissions } = req.body;

  if (!Array.isArray(toolPermissions)) {
    res.status(400).json({ message: "toolPermissions array required" });
    return;
  }

  try {
    await setCapabilitiesForPlan(planKey, toolPermissions);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update capabilities",
    });
  }
}

export async function updateToolPermissionController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const planKey = req.params.planKey;
  const toolKey = req.params.toolKey;

  if (!planKey || typeof planKey !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  if (!toolKey || typeof toolKey !== "string") {
    res.status(400).json({ message: "Tool key required" });
    return;
  }

  const { allowedActions, executionLevel, requiresConfirmation, conditions } = req.body;

  if (!allowedActions || typeof allowedActions !== "object") {
    res.status(400).json({ message: "Allowed actions required" });
    return;
  }

  try {
    await updateToolPermission(planKey, toolKey, {
      allowedActions: allowedActions,
      executionLevel: req.body.executionLevel,
      requiresConfirmation: req.body.requiresConfirmation,
      conditions: req.body.conditions,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update tool permission",
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