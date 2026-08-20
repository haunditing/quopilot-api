import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createTenantSchema,
  updateTenantSchema,
  updateTenantStatusSchema,
} from "../schemas/tenant-schema.js";
import {
  createTenant,
  getTenantById,
  getTenants,
  updateTenant,
  updateTenantStatus,
} from "../services/tenant-service.js";
import { getUsers } from "../services/user-service.js";
import { getPlanCapabilityMatrix } from "../services/capability-service.js";
import { Plan } from "../models/Plan.js";
import { AppUsageLimit } from "../models/AppUsageLimit.js";
import { checkUsageLimit } from "../services/usage-limit-service.js";
import {
  getSubscriptionByTenantId,
  createSubscriptionForTenant,
  changeTenantSubscriptionPlan,
  updateSubscriptionStatus,
} from "../services/subscription-service.js";

export async function getCurrentTenantCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenant = (req as any).tenant;
    if (!tenant || !tenant.plan) {
      res.status(400).json({ message: "Tenant plan context missing" });
      return;
    }
    const matrix = await getPlanCapabilityMatrix(tenant.plan);
    res.status(200).json({
      planKey: tenant.plan,
      featureKeys: matrix.featureKeys,
      capabilityCodes: matrix.capabilityCodes,
      effectiveCodes: matrix.entries.filter((e) => e.effective).map((e) => e.code),
      entries: matrix.entries,
    });
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant capabilities");
  }
}

function handleTenantError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message =
    error instanceof Error ? error.message : fallbackMessage;

  if (message === "Tenant not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "Invalid tenantId") {
    res.status(400).json({
      message,
    });

    return;
  }

  if (message === "A user with this email already exists") {
    res.status(409).json({
      message,
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    message: fallbackMessage,
  });
}

export async function getTenantsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const searchParam = req.query.search;
    const statusParam = req.query.status;

    const page = pageParam === undefined ? 1 : Number(pageParam);

    const limit = limitParam === undefined ? 20 : Number(limitParam);

    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({
        message: "Invalid page",
      });

      return;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        message: "Invalid limit. Must be between 1 and 100",
      });

      return;
    }

    const search =
      typeof searchParam === "string" ? searchParam : undefined;

    const status =
      typeof statusParam === "string" ? statusParam : undefined;

    const result = await getTenants({
      page,
      limit,
      search,
      status,
    });

    res.status(200).json(result);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenants");
  }
}

export async function getTenantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;

    if (typeof tenantId !== "string") {
      res.status(400).json({
        message: "Invalid tenantId",
      });

      return;
    }

    const tenant = await getTenantById(tenantId);

    res.status(200).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant");
  }
}

export async function getTenantUsersController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;

    if (typeof tenantId !== "string") {
      res.status(400).json({
        message: "Invalid tenantId",
      });

      return;
    }

    await getTenantById(tenantId);

    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const page = pageParam === undefined ? 1 : Number(pageParam);

    const limit = limitParam === undefined ? 20 : Number(limitParam);

    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({
        message: "Invalid page",
      });

      return;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        message: "Invalid limit. Must be between 1 and 100",
      });

      return;
    }

    const result = await getUsers({
      tenantId,
      page,
      limit,
    });

    res.status(200).json(result);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant users");
  }
}

export async function getCurrentTenantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });

      return;
    }

    const tenant = await getTenantById(tenantId);

    res.status(200).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant");
  }
}

export async function updateCurrentTenantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = updateTenantSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid tenant data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const tenant = await updateTenant(tenantId, result.data);

    res.status(200).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to update tenant");
  }
}

export async function createTenantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = createTenantSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid tenant data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const tenant = await createTenant(result.data);

    res.status(201).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to create tenant");
  }
}

export async function updateTenantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = updateTenantSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid tenant data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const tenantId = req.params.tenantId;

    if (typeof tenantId !== "string") {
      res.status(400).json({
        message: "Invalid tenantId",
      });

      return;
    }

    const tenant = await updateTenant(tenantId, result.data);

    res.status(200).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to update tenant");
  }
}

export async function updateTenantStatusController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = updateTenantStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid tenant status",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const tenantId = req.params.tenantId;

    if (typeof tenantId !== "string") {
      res.status(400).json({
        message: "Invalid tenantId",
      });

      return;
    }

    const tenant = await updateTenantStatus(tenantId, result.data.status);

    res.status(200).json(tenant);
  } catch (error) {
    handleTenantError(res, error, "Unable to update tenant status");
  }
}

async function buildTenantUsageResponse(tenantId: string, planKey = "FREE") {
  const plan = await Plan.findOne({ key: planKey.toUpperCase() }).lean();
  const catalogLimits = await AppUsageLimit.find({ isActive: true }).lean();
  const planLimitsMap = new Map(
    (plan?.usageLimits ?? []).map((ul: any) => [ul.code, ul.limit]),
  );

  const usageResults = await Promise.all(
    catalogLimits.map(async (limitDef: any) => {
      const configuredLimit = planLimitsMap.get(limitDef.code) ?? limitDef.defaultValue;
      const check = await checkUsageLimit(tenantId, limitDef.code, 0);
      return {
        code: limitDef.code,
        name: limitDef.name,
        description: limitDef.description,
        unit: limitDef.unit,
        limit: configuredLimit,
        current: check.current,
        allowed: check.allowed,
      };
    }),
  );

  return {
    planKey,
    usage: usageResults,
  };
}

export async function getCurrentTenantUsageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenant = (req as any).tenant;
    if (!tenant || !tenant.plan) {
      res.status(400).json({ message: "Tenant plan context missing" });
      return;
    }
    const data = await buildTenantUsageResponse(tenant._id.toString(), tenant.plan);
    res.status(200).json(data);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant usage");
  }
}

export async function getTenantUsageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;
    if (typeof tenantId !== "string") {
      res.status(400).json({ message: "Invalid tenantId" });
      return;
    }
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }
    const data = await buildTenantUsageResponse(tenant._id.toString(), tenant.plan);
    res.status(200).json(data);
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant usage");
  }
}

export async function updateTenantPlanController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;
    const { plan } = req.body;
    if (typeof tenantId !== "string" || !plan || typeof plan !== "string") {
      res.status(400).json({ message: "Invalid tenantId or plan key" });
      return;
    }
    const updated = await updateTenant(tenantId, { plan: plan.toUpperCase() } as any);
    try {
      await changeTenantSubscriptionPlan(tenantId, plan.toUpperCase());
    } catch {
      // ignore if subscription doesn't exist yet
    }
    res.status(200).json(updated);
  } catch (error) {
    handleTenantError(res, error, "Unable to update tenant plan");
  }
}

export async function getTenantSubscriptionController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;
    if (typeof tenantId !== "string") {
      res.status(400).json({ message: "Invalid tenantId" });
      return;
    }
    const sub = await getSubscriptionByTenantId(tenantId);
    res.status(200).json(sub ?? { tenantId, status: "TRIAL", planKey: "FREE" });
  } catch (error) {
    handleTenantError(res, error, "Unable to load tenant subscription");
  }
}

export async function updateTenantSubscriptionController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.params.tenantId;
    const { status, planKey } = req.body;
    if (typeof tenantId !== "string") {
      res.status(400).json({ message: "Invalid tenantId" });
      return;
    }
    let sub = await getSubscriptionByTenantId(tenantId);
    if (!sub) {
      sub = await createSubscriptionForTenant(tenantId, planKey);
    }
    if (planKey) {
      await changeTenantSubscriptionPlan(tenantId, planKey);
    }
    if (status) {
      await updateSubscriptionStatus(tenantId, status);
    }
    const updated = await getSubscriptionByTenantId(tenantId);
    res.status(200).json(updated);
  } catch (error) {
    handleTenantError(res, error, "Unable to update tenant subscription");
  }
}
