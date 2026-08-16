import { Router } from "express";
import {
  handleWebhookEvent,
  handleWebhookVerification,
} from "../controllers/webhook-controller.js";

const router = Router();

router.get("/:type/:channelId", handleWebhookVerification);

router.post("/:type/:channelId", handleWebhookEvent);

export default router;
