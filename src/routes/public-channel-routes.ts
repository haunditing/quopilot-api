import { Router } from "express";
import {
  getPublicChannelConfigController,
  getPublicChannelPageController,
  getPublicTokenByTenantController,
} from "../controllers/PublicChannelController.js";
import {
  webchatSsrSecurityHeaders,
  webchatSecurityHeaders,
} from "../middleware/webchat-security-middleware.js";
import { publicChatReadLimiter } from "../config/rate-limit.js";

/**
 * Rutas públicas del canal WebChat.
 *
 * - GET /api/v1/public/channels/:token → configuración JSON (CORS público)
 * - GET /c/:token                      → página SSR con OpenGraph
 */
export const publicChannelApiRouter = Router();

publicChannelApiRouter.get(
  "/by-tenant/:tenantId",
  webchatSecurityHeaders({ publicCors: true }),
  publicChatReadLimiter,
  getPublicTokenByTenantController,
);

publicChannelApiRouter.get(
  "/:token",
  webchatSecurityHeaders({ publicCors: true }),
  publicChatReadLimiter,
  getPublicChannelConfigController,
);

export const publicChannelPageRouter = Router();

publicChannelPageRouter.get(
  "/c/:token",
  webchatSsrSecurityHeaders,
  publicChatReadLimiter,
  getPublicChannelPageController,
);
