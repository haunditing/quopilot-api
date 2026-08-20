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
import { requireCapability } from "../middleware/entitlement-middleware.js";
import { requireUsageLimit } from "../services/usage-limit-service.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireTenant,
  requireCapability("channels.view"),
  listChannelsController,
);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("channels.create"),
  requireUsageLimit("channels.max"),
  createChannelController,
);

router.get(
  "/:channelId",
  authenticate,
  requireTenant,
  requireCapability("channels.detail"),
  getChannelController,
);

router.patch(
  "/:channelId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("channels.update"),
  updateChannelController,
);

router.patch(
  "/:channelId/status",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("channels.changeStatus"),
  updateChannelStatusController,
);

router.delete(
  "/:channelId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("channels.delete"),
  deleteChannelController,
);

export default router;
