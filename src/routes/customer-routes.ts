import { Router } from "express";
import {
  createCustomerController,
  deleteCustomerController,
  getCustomersController,
  updateCustomerController,
} from "../controllers/customer-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get("/", authenticate, requireTenant, getCustomersController);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN"),
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
