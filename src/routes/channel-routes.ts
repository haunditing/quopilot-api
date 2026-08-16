import { Router } from "express";
import {
  createChannelController,
  deleteChannelController,
  getChannelController,
  listChannelsController,
  updateChannelController,
  updateChannelStatusController,
} from "../controllers/channel-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireTenant,
  listChannelsController,
);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  createChannelController,
);

router.get(
  "/:channelId",
  authenticate,
  requireTenant,
  getChannelController,
);

router.patch(
  "/:channelId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateChannelController,
);

router.patch(
  "/:channelId/status",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateChannelStatusController,
);

router.delete(
  "/:channelId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  deleteChannelController,
);

export default router;
