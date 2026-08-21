import express from "express";
import cors from "cors";
import type { Request } from "express";
import authRoutes from "./routes/auth-routes";
import superAdminDashboardRoutes from "./routes/super-admin-dashboard-routes.js";
import saleRoutes from "./routes/sale-routes.js";
import tenantDashboardRoutes from "./routes/tenant-dashboard-routes.js";
import {
  authenticate,
  AuthenticatedRequest,
} from "./middleware/auth-middleware";
import quoteRoutes from "./routes/quote-routes";
import dashboardRoutes from "./routes/dashboard-routes";
import customerRoutes from "./routes/customer-routes.js";
import productRoutes from "./routes/product-routes.js";
import agentDashboardRoutes from "./routes/agent-dashboard-routes";
import tenantRoutes from "./routes/tenant-routes.js";
import userRoutes from "./routes/user-routes.js";
import agentRoutes from "./routes/agent-routes.js";
import agentPublicRoutes from "./routes/agent-public-routes.js";
import channelRoutes from "./routes/channel-routes.js";
import webhookRoutes from "./routes/webhook-routes.js";
import conversationRoutes from "./routes/conversation-routes.js";
import internalAssistantRoutes from "./routes/internal-assistant-routes.js";
import supportAssistantRoutes from "./routes/support-assistant-routes.js";
import superAdminSupportAssistantRoutes from "./routes/super-admin-support-assistant-routes.js";
import planRoutes from "./routes/plan-routes.js";
import assistantCapabilitiesRoutes from "./routes/assistant-capabilities-routes.js";
import catalogRoutes from "./routes/catalog-routes.js";
import commercialPolicyRoutes from "./routes/commercial-policy-routes.js";
import meRoutes from "./routes/me-routes.js";
import { getCapabilitiesReport } from "./capabilities/index.js";

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

const app = express();

app.use(cors());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "quopilot-api",
  });
});

app.get("/api/auth/me", authenticate, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user,
  });
});

app.get("/api/capabilities", (_req, res) => {
  res.json(getCapabilitiesReport());
});

app.use("/api/me", meRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/super-admin/dashboard", superAdminDashboardRoutes);
app.use("/api/tenant/dashboard", tenantDashboardRoutes);
app.use("/api/agent/dashboard", agentDashboardRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/agent/public", agentPublicRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/internal/assistant", internalAssistantRoutes);
app.use("/api/support/assistant", supportAssistantRoutes);
app.use("/api/super-admin/support/assistant", superAdminSupportAssistantRoutes);
app.use("/api/super-admin/plans", planRoutes);
app.use("/api/super-admin/assistant-capabilities", assistantCapabilitiesRoutes);
app.use("/api/super-admin/commercial-policy", commercialPolicyRoutes);
app.use("/api/admin", catalogRoutes);
app.use("/api/plans", planRoutes);

export default app;
