import { Tenant } from "../models/Tenant.js";
import { Plan } from "../models/Plan.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { User } from "../models/User.js";
import { Channel } from "../models/Channel.js";
import { Types } from "mongoose";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";

export type UsageLimitKey =
  | "maxCustomers"
  | "maxProducts"
  | "maxQuotesPerMonth"
  | "maxSalesPerMonth"
  | "maxActiveAgents"
  | "maxChannels"
  | "maxAiQueriesPerMonth";

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitKey: UsageLimitKey;
}

export async function checkUsageLimit(
  tenantId: string,
  limitKey: UsageLimitKey,
  increment = 1,
): Promise<UsageCheckResult> {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }
  const tenantObjectId = new Types.ObjectId(tenantId);

  const tenant = await Tenant.findById(tenantId).select("plan").lean();
  if (!tenant || !tenant.plan) {
    return { allowed: true, current: 0, limit: -1, limitKey };
  }

  const plan = await Plan.findOne({ key: tenant.plan.toUpperCase() }).lean();
  if (!plan || !plan.usageLimits) {
    return { allowed: true, current: 0, limit: -1, limitKey };
  }

  const limits = plan.usageLimits as Record<string, number | undefined>;
  const limit = limits[limitKey];

  if (limit === undefined || limit === null || limit < 0) {
    return { allowed: true, current: 0, limit: -1, limitKey };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let current = 0;
  switch (limitKey) {
    case "maxCustomers":
      current = await Customer.countDocuments({ tenantId: tenantObjectId, isLead: { $ne: true } });
      break;
    case "maxProducts":
      current = await Product.countDocuments({ tenantId: tenantObjectId });
      break;
    case "maxQuotesPerMonth":
      current = await Quote.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfMonth } });
      break;
    case "maxSalesPerMonth":
      current = await Sale.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfMonth } });
      break;
    case "maxActiveAgents":
      current = await User.countDocuments({ tenantId: tenantObjectId, role: "AGENT", status: "ACTIVE" });
      break;
    case "maxChannels":
      current = await Channel.countDocuments({ tenantId: tenantObjectId, status: "ACTIVE" });
      break;
    case "maxAiQueriesPerMonth":
      current = 0;
      break;
  }

  const allowed = (current + increment) <= limit;
  return { allowed, current, limit, limitKey };
}

/**
 * Middleware para bloquear operaciones si se excede el límite de uso del plan.
 */
export function requireUsageLimit(limitKey: UsageLimitKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || (req as any).tenant?._id?.toString();
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing for usage check" });
    }

    try {
      const result = await checkUsageLimit(tenantId, limitKey, 1);
      if (!result.allowed) {
        return res.status(429).json({
          message: `Límite de uso excedido para ${limitKey} (${result.current}/${result.limit}). Actualiza tu plan para continuar.`,
          code: "QUOTA_EXCEEDED",
          limitKey,
          current: result.current,
          limit: result.limit,
        });
      }
      next();
    } catch (error) {
      console.error(`[UsageLimit] Error checking limit ${limitKey}:`, error);
      res.status(500).json({ message: "Internal usage limit check error" });
    }
  };
}
