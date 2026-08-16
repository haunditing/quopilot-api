import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { getSuperAdminDashboardSummary } from "../services/super-admin-dashboard-service.js";

export async function getSuperAdminDashboardController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (req.user?.role !== "SUPER_ADMIN") {
      res.status(403).json({
        message: "Super admin access required",
      });
      return;
    }

    const summary = await getSuperAdminDashboardSummary();

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load super admin dashboard",
    });
  }
}