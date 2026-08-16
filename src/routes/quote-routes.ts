import { Router } from "express";
import {
  createQuoteController,
  sendQuoteController,
  acceptQuoteController,
  updateQuoteController,
  getQuotesController,
} from "../controllers/quote-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { getQuoteByIdController } from "../controllers/quote-controller.js";

const router = Router();

router.post("/", authenticate, requireTenant, createQuoteController);

router.patch("/:quoteId", authenticate, requireTenant, updateQuoteController);

router.post("/:quoteId/send", authenticate, requireTenant, sendQuoteController);

router.post(
  "/:quoteId/accept",
  authenticate,
  requireTenant,
  acceptQuoteController,
);

router.get("/", authenticate, requireTenant, getQuotesController);
router.get("/:quoteId", authenticate, requireTenant, getQuoteByIdController);

export default router;
