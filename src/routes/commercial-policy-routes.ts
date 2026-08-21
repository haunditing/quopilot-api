import { Router, Response } from "express";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  getPlatformCommercialPolicy,
  updatePlatformCommercialPolicy,
} from "../services/commercial-policy-service.js";

import "../capabilities/superAdmin.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const policy = await getPlatformCommercialPolicy();
    res.status(200).json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load commercial policy" });
  }
});

router.put("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await updatePlatformCommercialPolicy(req.body);
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update commercial policy" });
  }
});

export default router;
