import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  PlanNotFoundError,
  createPlan,
  deletePlan,
  getPlanByIdentifier,
  getPlanEnabledFeatures,
  listPlans,
  setDefaultPlan,
  updatePlan,
} from "../services/plan-service.js";
import { createPlanSchema, updatePlanSchema } from "../schemas/plan-schema.js";
import { getPlanCapabilityMatrix } from "../services/capability-service.js";
import { notifyLandingRevalidation } from "../services/revalidation.js";

function notFound(res: Response): void {
  res.status(404).json({ message: "Plan not found" });
}

export async function listPlansController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const plans = await listPlans({ includeArchived });
    res.status(200).json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load plans" });
  }
}

export async function getPlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  try {
    const plan = await getPlanByIdentifier(id);
    if (!plan) {
      notFound(res);
      return;
    }
    res.status(200).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load plan" });
  }
}

export async function createPlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = createPlanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      message: "Invalid plan data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const plan = await createPlan(result.data);
    await notifyLandingRevalidation();
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create plan",
    });
  }
}

export async function updatePlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  const result = updatePlanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      message: "Invalid plan data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const plan = await updatePlan(id, result.data);
    await notifyLandingRevalidation();
    res.status(200).json(plan);
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      notFound(res);
      return;
    }
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update plan",
    });
  }
}

export async function deletePlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  try {
    const result = await deletePlan(id);
    await notifyLandingRevalidation();
    if (result.warning) {
      // Soft delete se aplica; se informa la advertencia de dependencias.
      res.status(409).json({
        message: result.warning.message,
        code: result.warning.code,
        activeTenants: result.warning.activeTenants,
        archived: true,
      });
      return;
    }
    res.status(200).json({ archived: true });
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      notFound(res);
      return;
    }
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete plan",
    });
  }
}

export async function setDefaultPlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  try {
    const plan = await setDefaultPlan(id);
    await notifyLandingRevalidation();
    res.status(200).json(plan);
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      notFound(res);
      return;
    }
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to set default plan",
    });
  }
}

export async function getPlanFeaturesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  try {
    const features = await getPlanEnabledFeatures(id);
    res.status(200).json(features);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load plan features" });
  }
}

export async function updatePlanFeaturesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  const { enabledFeatures } = req.body;

  if (!Array.isArray(enabledFeatures)) {
    res.status(400).json({ message: "enabledFeatures array required" });
    return;
  }

  try {
    const plan = await updatePlan(id, { enabledFeatures });
    await notifyLandingRevalidation();
    res.status(200).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update plan features",
    });
  }
}

export async function getPlanCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  try {
    const matrix = await getPlanCapabilityMatrix(id);
    res.status(200).json(matrix);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load plan capabilities",
    });
  }
}

export async function updatePlanCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Plan id or key required" });
    return;
  }

  const { enabledCapabilities } = req.body;

  if (!Array.isArray(enabledCapabilities)) {
    res.status(400).json({ message: "enabledCapabilities array required" });
    return;
  }

  try {
    const plan = await updatePlan(id, { enabledCapabilities });
    await notifyLandingRevalidation();
    res.status(200).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update plan capabilities",
    });
  }
}
