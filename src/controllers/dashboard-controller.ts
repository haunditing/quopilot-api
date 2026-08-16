import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { getDashboardSummary } from "../services/dashboard-service.js";

export async function getDashboardSummaryController(
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

    const summary = await getDashboardSummary(tenantId);

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load dashboard summary",
    });
  }
}
