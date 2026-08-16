import type { Request, Response } from "express";
import {
  getWebhookRuntimeChannel,
  processInstagramWebhook,
  processWhatsAppWebhook,
  verifyWebhookSignature,
  verifyWebhookSubscription,
  type WebhookChannelType,
} from "../services/channel-webhook-service.js";

interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

const UNKNOWN_REASON = "Webhook not found";

function readWebhookType(req: Request): WebhookChannelType | null {
  const raw = String(req.params.type ?? "").toUpperCase();

  if (raw !== "WHATSAPP" && raw !== "INSTAGRAM") {
    return null;
  }

  return raw;
}

export async function handleWebhookVerification(
  req: Request,
  res: Response,
): Promise<void> {
  const channelId = String(req.params.channelId ?? "");
  const expectedType = readWebhookType(req);

  if (!expectedType) {
    res.status(404).json({
      message: UNKNOWN_REASON,
    });

    return;
  }

  const result = await verifyWebhookSubscription({
    channelId,
    expectedType,
    mode:
      typeof req.query["hub.mode"] === "string"
        ? req.query["hub.mode"]
        : undefined,
    verifyToken:
      typeof req.query["hub.verify_token"] === "string"
        ? req.query["hub.verify_token"]
        : undefined,
    challenge:
      typeof req.query["hub.challenge"] === "string"
        ? req.query["hub.challenge"]
        : undefined,
  });

  if (!result.ok) {
    res.status(403).json({
      message: "Verification failed",
      reason: result.reason,
    });

    return;
  }

  res.type("text/plain").status(200).send(result.challenge);
}

export async function handleWebhookEvent(
  req: WebhookRequest,
  res: Response,
): Promise<void> {
  const channelId = String(req.params.channelId ?? "");
  const expectedType = readWebhookType(req);

  if (!expectedType) {
    res.status(404).json({
      message: UNKNOWN_REASON,
    });

    return;
  }

  const channel = await getWebhookRuntimeChannel(channelId);

  if (!channel || channel.type !== expectedType) {
    res.status(404).json({
      message: UNKNOWN_REASON,
    });

    return;
  }

  if (channel.status !== "ACTIVE") {
    res.status(404).json({
      message: UNKNOWN_REASON,
    });

    return;
  }

  const signature = req.headers["x-hub-signature-256"];

  const signatureHeader =
    typeof signature === "string" ? signature : undefined;

  const rawBody = req.rawBody;

  if (!rawBody) {
    res.status(400).json({
      message: "Raw body is required for signature verification",
    });

    return;
  }

  const valid = await verifyWebhookSignature(
    channel,
    rawBody,
    signatureHeader,
  );

  if (!valid) {
    res.status(401).json({
      message: "Invalid webhook signature",
    });

    return;
  }

  const payload = req.body as unknown;

  if (typeof payload !== "object" || payload === null) {
    res.status(400).json({
      message: "Invalid webhook payload",
    });

    return;
  }

  const outcome =
    expectedType === "WHATSAPP"
      ? await processWhatsAppWebhook(channel, payload)
      : await processInstagramWebhook(channel, payload);

  res.status(200).json({
    status: "EVENT_RECEIVED",
    processed: outcome.processed,
  });
}
