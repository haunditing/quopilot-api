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

const router = Router();

router.get("/", authenticate, requireTenant, getCustomersController);

router.get("/:customerId", authenticate, requireTenant, getCustomerController);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN", "AGENT"),
  requireTenant,
  createCustomerController,
);

router.patch(
  "/:customerId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateCustomerController,
);

router.delete(
  "/:customerId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  deleteCustomerController,
);

export default router;
