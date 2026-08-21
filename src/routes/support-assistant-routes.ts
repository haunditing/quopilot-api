import { Router } from "express";
import {
  confirmSupportCaseController,
  createKnowledgeDocController,
  createSupportCaseController,
  deleteKnowledgeDocController,
  deleteSupportCaseController,
  getSupportConfigController,
  getSupportMetricsController,
  listKnowledgeDocsController,
  listSupportCasesController,
  listSupportMessagesController,
  resetSupportConversationController,
  sendSupportMessageController,
  updateKnowledgeDocController,
  updateSupportConfigController,
  updateSupportCaseController,
} from "../controllers/support-assistant-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

import "../capabilities/supportAssistant.js";

const router = Router();

router.use(authenticate, authorize("TENANT_ADMIN"), requireTenant);

router.get("/messages", listSupportMessagesController);
router.post("/messages", sendSupportMessageController);
router.post("/reset", resetSupportConversationController);
router.get("/metrics", getSupportMetricsController);
router.get("/knowledge", listKnowledgeDocsController);
router.post("/knowledge", createKnowledgeDocController);
router.put("/knowledge/:docId", updateKnowledgeDocController);
router.delete("/knowledge/:docId", deleteKnowledgeDocController);
router.get("/cases", listSupportCasesController);
router.post("/cases", createSupportCaseController);
router.put("/cases/:caseId", updateSupportCaseController);
router.post("/cases/:caseId/confirm", confirmSupportCaseController);
router.delete("/cases/:caseId", deleteSupportCaseController);

export default router;