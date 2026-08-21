import { Router } from "express";
import {
  createCustomerController,
  deleteCustomerController,
  getCustomerController,
  getCustomersController,
  updateCustomerController,
} from "../controllers/customer-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";
import { requireUsageLimit } from "../services/usage-limit-service.js";

import "../capabilities/customers.js";

const router = Router();

router.get("/", authenticate, requireTenant, requireCapability("customers.view"), getCustomersController);

router.get("/:customerId", authenticate, requireTenant, requireCapability("customers.detail"), getCustomerController);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN", "AGENT"),
  requireTenant,
  requireCapability("customers.create"),
  requireUsageLimit("customers.max"),
  createCustomerController,
);

router.patch(
  "/:customerId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("customers.update"),
  updateCustomerController,
);

router.delete(
  "/:customerId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("customers.delete"),
  deleteCustomerController,
);

export default router;
