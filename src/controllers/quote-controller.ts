import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createQuote,
  updateQuote,
} from "../services/quote-service.js";
import { acceptQuote } from "../services/quote-acceptance-service.js";
import { sendQuote } from "../services/quote-delivery-service.js";
import { getQuotes } from "../services/quote-query-service.js";
import { getQuoteById } from "../services/quote-detail-service.js";

export async function createQuoteController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const { customerId, conversationId, items, validUntil } = req.body;

    if (typeof customerId !== "string" || !Array.isArray(items)) {
      res.status(400).json({
        message: "customerId and items are required",
      });
      return;
    }

    const quote = await createQuote({
      tenantId,
      customerId,
      conversationId,
      items,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    res.status(201).json({
      quote,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create quote";

    if (
      message === "Customer not found" ||
      message === "One or more products are invalid"
    ) {
      res.status(404).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to create quote",
    });
  }
}

export async function updateQuoteController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const quoteId = req.params.quoteId;

    if (typeof quoteId !== "string") {
      res.status(400).json({
        message: "Invalid quoteId",
      });
      return;
    }

    const { customerId, items, validUntil } = req.body;

    if (typeof customerId !== "string" || !Array.isArray(items)) {
      res.status(400).json({
        message: "customerId and items are required",
      });
      return;
    }

    const quote = await updateQuote(tenantId, quoteId, {
      customerId,
      items,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    res.status(200).json({
      quote,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update quote";

    if (
      message === "Quote not found" ||
      message === "Customer not found" ||
      message === "One or more products are invalid"
    ) {
      res.status(404).json({
        message,
      });
      return;
    }

    if (message.startsWith("Quote cannot be updated")) {
      res.status(409).json({
        message,
      });
      return;
    }

    if (
      message === "Invalid quoteId" ||
      message === "Invalid customerId" ||
      message === "Quote must contain at least one item"
    ) {
      res.status(400).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to update quote",
    });
  }
}

export async function sendQuoteController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const quoteId = req.params.quoteId;

    if (typeof quoteId !== "string") {
      res.status(400).json({
        message: "Invalid quoteId",
      });
      return;
    }

    const quote = await sendQuote(tenantId, quoteId);

    res.status(200).json({
      quote,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send quote";

    if (message === "Quote not found") {
      res.status(404).json({
        message,
      });
      return;
    }

    if (message.startsWith("Quote cannot be sent")) {
      res.status(409).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to send quote",
    });
  }
}

export async function acceptQuoteController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const quoteId = req.params.quoteId;

    if (typeof quoteId !== "string") {
      res.status(400).json({
        message: "Invalid quoteId",
      });
      return;
    }

    const result = await acceptQuote(tenantId, quoteId);

    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to accept quote";

    if (message === "Quote not found") {
      res.status(404).json({
        message,
      });
      return;
    }

    if (message.startsWith("Quote cannot be accepted")) {
      res.status(409).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to accept quote",
    });
  }
}

export async function getQuotesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const statusParam = req.query.status;
    const customerIdParam = req.query.customerId;
    const searchParam = req.query.search;

    const page = pageParam === undefined ? 1 : Number(pageParam);

    const limit = limitParam === undefined ? 20 : Number(limitParam);

    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({
        message: "Invalid page",
      });
      return;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        message: "Invalid limit. Must be between 1 and 100",
      });
      return;
    }

    const status = typeof statusParam === "string" ? statusParam : undefined;

    const customerId =
      typeof customerIdParam === "string" ? customerIdParam : undefined;

    const search = typeof searchParam === "string" ? searchParam : undefined;

    const userId = req.user?.role === "AGENT" ? req.user.id : undefined;

    const result = await getQuotes({
      tenantId,
      page,
      limit,
      status,
      customerId,
      search,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load quotes";

    if (message === "Invalid tenantId" || message === "Invalid customerId") {
      res.status(400).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to load quotes",
    });
  }
}

export async function getQuoteByIdController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const quoteId = req.params.quoteId;

    if (typeof quoteId !== "string") {
      res.status(400).json({
        message: "Invalid quoteId",
      });
      return;
    }

    const result = await getQuoteById(tenantId, quoteId);

    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load quote";

    if (message === "Invalid quoteId") {
      res.status(400).json({
        message,
      });
      return;
    }

    if (message === "Quote not found") {
      res.status(404).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to load quote",
    });
  }
}
