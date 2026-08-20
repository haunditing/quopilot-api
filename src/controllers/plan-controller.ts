import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createPlan,
  deletePlan,
  getPlanByKey,
  getPlanEnabledFeatures,
  listPlans,
  setDefaultPlan,
  updatePlan,
} from "../services/plan-service.js";
import { createPlanSchema, updatePlanSchema } from "../schemas/plan-schema.js";

export async function listPlansController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const plans = await listPlans();
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    const plan = await getPlanByKey(key);
    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
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
    const plan = await updatePlan(key, result.data);
    res.status(200).json(plan);
  } catch (error) {
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    const result = await deletePlan(key);
    res.status(200).json(result);
  } catch (error) {
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    const plan = await setDefaultPlan(key);
    res.status(200).json(plan);
  } catch (error) {
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  try {
    const features = await getPlanEnabledFeatures(key);
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
  const key = req.params.key;
  if (!key || typeof key !== "string") {
    res.status(400).json({ message: "Plan key required" });
    return;
  }

  const { enabledFeatures } = req.body;

  if (!Array.isArray(enabledFeatures)) {
    res.status(400).json({ message: "enabledFeatures array required" });
    return;
  }

  try {
    const plan = await (await import("../services/plan-service.js")).updatePlan(key, {
      enabledFeatures,
    });
    res.status(200).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update plan features",
    });
  }
}