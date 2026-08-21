import { Router } from "express";
import {
  cancelSaleController,
  deleteSaleController,
  getSaleController,
  getSalesController,
} from "../controllers/sale-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";

import "../capabilities/sales.js";

const router = Router();

router.get("/", authenticate, requireTenant, requireCapability("sales.view"), getSalesController);

router.get("/:saleId", authenticate, requireTenant, requireCapability("sales.detail"), getSaleController);

router.post(
  "/:saleId/cancel",
  authenticate,
  requireTenant,
  requireCapability("sales.cancel"),
  cancelSaleController,
);

router.delete("/:saleId", authenticate, requireTenant, requireCapability("sales.delete"), deleteSaleController);

export default router;
