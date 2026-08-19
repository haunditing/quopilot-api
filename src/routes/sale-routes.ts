import { Router } from "express";
import {
  cancelSaleController,
  deleteSaleController,
  getSaleController,
  getSalesController,
} from "../controllers/sale-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get("/", authenticate, requireTenant, getSalesController);

router.get("/:saleId", authenticate, requireTenant, getSaleController);

router.post(
  "/:saleId/cancel",
  authenticate,
  requireTenant,
  cancelSaleController,
);

router.delete("/:saleId", authenticate, requireTenant, deleteSaleController);

export default router;
