import { Router } from "express";
import {
  handleWebhookEvent,
  handleWebhookVerification,
} from "../controllers/webhook-controller.js";

import "../capabilities/webhooks.js";

const router = Router();

router.get("/:type/:channelId", handleWebhookVerification);

router.post("/:type/:channelId", handleWebhookEvent);

export default router;
