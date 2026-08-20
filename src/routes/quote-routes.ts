import { Router } from "express";
import {
  createQuoteController,
  sendQuoteController,
  acceptQuoteController,
  updateQuoteController,
  getQuotesController,
  getNextQuoteNumberController,
} from "../controllers/quote-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";
import { requireUsageLimit } from "../services/usage-limit-service.js";
import { getQuoteByIdController } from "../controllers/quote-controller.js";

const router = Router();

router.post("/", authenticate, requireTenant, requireCapability("quotes.create"), requireUsageLimit("quotes.maxMonthly"), createQuoteController);

router.patch("/:quoteId", authenticate, requireTenant, requireCapability("quotes.update"), updateQuoteController);

router.post("/:quoteId/send", authenticate, requireTenant, requireCapability("quotes.send"), sendQuoteController);

router.post(
  "/:quoteId/accept",
  authenticate,
  requireTenant,
  requireCapability("quotes.accept"),
  acceptQuoteController,
);

router.get("/", authenticate, requireTenant, requireCapability("quotes.view"), getQuotesController);
router.get(
  "/next-number",
  authenticate,
  requireTenant,
  requireCapability("quotes.view"),
  getNextQuoteNumberController,
);
router.get("/:quoteId", authenticate, requireTenant, requireCapability("quotes.detail"), getQuoteByIdController);

export default router;
