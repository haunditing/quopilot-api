import crypto from "node:crypto";
import { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Message } from "../models/Message.js";
import type { ConversationChannel } from "../models/Conversation.js";
import {
  getChannelByIdUnscoped,
  toRuntimeChannel,
  type RuntimeChannel,
} from "./channel-query-service.js";
import { openChannelConversation } from "./agent-conversation-service.js";
import { processInboundMessage } from "./agent-runtime-service.js";
import { sendChannelReply } from "./channel-sender-service.js";

export type WebhookChannelType = "WHATSAPP" | "INSTAGRAM";

interface VerifySubscriptionInput {
  channelId: string;
  expectedType: WebhookChannelType;
  mode: string | undefined;
  verifyToken: string | undefined;
  challenge: string | undefined;
}

export type VerifySubscriptionResult =
  | {
      ok: true;
      challenge: string;
      channel: RuntimeChannel;
    }
  | {
      ok: false;
      reason: "INVALID_MODE" | "MISSING_PARAMS" | "TYPE_MISMATCH" | "NOT_FOUND" | "INACTIVE" | "TOKEN_MISMATCH";
    };

function safeStringEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

async function loadWebhookChannel(
  channelId: string,
): Promise<RuntimeChannel | null> {
  if (!Types.ObjectId.isValid(channelId)) {
    return null;
  }

  const channel = await getChannelByIdUnscoped(channelId);

  return channel ? toRuntimeChannel(channel) : null;
}

export async function getWebhookRuntimeChannel(
  channelId: string,
): Promise<RuntimeChannel | null> {
  return loadWebhookChannel(channelId);
}

export async function verifyWebhookSubscription(
  input: VerifySubscriptionInput,
): Promise<VerifySubscriptionResult> {
  const { channelId, expectedType, mode, verifyToken, challenge } = input;

  if (mode !== "subscribe") {
    return {
      ok: false,
      reason: "INVALID_MODE",
    };
  }

  if (!verifyToken || !challenge) {
    return {
      ok: false,
      reason: "MISSING_PARAMS",
    };
  }

  const channel = await loadWebhookChannel(channelId);

  if (!channel) {
    return {
      ok: false,
      reason: "NOT_FOUND",
    };
  }

  if (channel.status !== "ACTIVE") {
    return {
      ok: false,
      reason: "INACTIVE",
    };
  }

  if (channel.type !== expectedType) {
    return {
      ok: false,
      reason: "TYPE_MISMATCH",
    };
  }

  const expectedToken = channel.credentials.verifyToken;

  if (!expectedToken || !safeStringEqual(expectedToken, verifyToken)) {
    return {
      ok: false,
      reason: "TOKEN_MISMATCH",
    };
  }

  return {
    ok: true,
    challenge,
    channel,
  };
}

export async function verifyWebhookSignature(
  channel: RuntimeChannel,
  rawBody: Buffer,
  signatureHeader: string | undefined,
): Promise<boolean> {
  const secret = channel.credentials.webhookSecret;

  if (!secret || !signatureHeader) {
    return false;
  }

  const expectedPrefix = "sha256=";

  if (!signatureHeader.startsWith(expectedPrefix)) {
    return false;
  }

  const receivedHex = signatureHeader.slice(expectedPrefix.length);

  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return safeStringEqual(receivedHex.toLowerCase(), digest);
}

interface IncomingMessage {
  externalId: string;
  from: string;
  name?: string;
  text: string;
}

async function processIncomingMessage(input: {
  channel: RuntimeChannel;
  message: IncomingMessage;
}): Promise<{
  processed: boolean;
  reply?: string;
  delivered?: boolean;
}> {
  const { channel, message } = input;

  const tenantId = channel.tenantId;
  const channelType: ConversationChannel = channel.type;

  const alreadyProcessed = await Message.exists({
    tenantId,
    externalMessageId: message.externalId,
  });

  if (alreadyProcessed) {
    return {
      processed: false,
    };
  }

  let customer = channelType === "WHATSAPP"
    ? await Customer.findOne({
        tenantId,
        whatsappId: message.from,
      }).lean()
    : await Customer.findOne({
        tenantId,
        instagramId: message.from,
      }).lean();

  if (!customer) {
    const [created] = await Customer.create([
      {
        tenantId,
        name: message.name?.trim() || (channelType === "WHATSAPP" ? "Cliente WhatsApp" : "Cliente Instagram"),
        phone: channelType === "WHATSAPP" ? message.from : undefined,
        whatsappId: channelType === "WHATSAPP" ? message.from : undefined,
        instagramId: channelType === "INSTAGRAM" ? message.from : undefined,
        isLead: true,
      },
    ]);

    customer = created.toObject();
  } else if (message.name?.trim() && !customer.name) {
    await Customer.updateOne(
      {
        _id: customer._id,
        tenantId,
      },
      {
        $set: {
          name: message.name.trim(),
        },
      },
    );
  }

  const conversation = await openChannelConversation({
    tenantId,
    channelId: channel.id,
    channel: channelType,
    customerId: customer._id.toString(),
    externalConversationId: message.from,
    agentId: channel.agentId,
  });

  const outcome = await processInboundMessage({
    tenantId,
    conversationId: conversation._id.toString(),
    content: message.text,
    externalMessageId: message.externalId,
  });

  const reply = outcome.reply;

  if (reply.trim()) {
    const sent = await sendChannelReply({
      channel,
      to: message.from,
      text: reply,
    });

    return {
      processed: true,
      reply,
      delivered: sent.delivered,
    };
  }

  return {
    processed: true,
    reply,
  };
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        contacts?: Array<{
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
}

export async function processWhatsAppWebhook(
  channel: RuntimeChannel,
  payload: WhatsAppWebhookPayload,
): Promise<{
  processed: number;
}> {
  let processed = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        continue;
      }

      const value = change.value;

      if (!value) {
        continue;
      }

      for (const incoming of value.messages ?? []) {
        if (incoming.type !== "text" || !incoming.text?.body) {
          continue;
        }

        if (!incoming.from || !incoming.id) {
          continue;
        }

        const contact = value.contacts?.find(
          (candidate) => candidate.wa_id === incoming.from,
        );

        try {
          const outcome = await processIncomingMessage({
            channel,
            message: {
              externalId: incoming.id,
              from: incoming.from,
              name: contact?.profile?.name,
              text: incoming.text.body,
            },
          });

          if (outcome.processed) {
            processed += 1;
          }
        } catch (error) {
          console.error(
            "[channel-webhook] whatsapp message error:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
  }

  return {
    processed,
  };
}

interface InstagramWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        sender?: {
          id?: string;
        };
        recipient?: {
          id?: string;
        };
        message?: {
          mid?: string;
          text?: string;
        };
      };
    }>;
  }>;
}

export async function processInstagramWebhook(
  channel: RuntimeChannel,
  payload: InstagramWebhookPayload,
): Promise<{
  processed: number;
}> {
  let processed = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        continue;
      }

      const value = change.value;

      if (!value) {
        continue;
      }

      if (!value.message?.text) {
        continue;
      }

      const senderId = value.sender?.id;
      const mid = value.message.mid;

      if (!senderId || !mid) {
        continue;
      }

      try {
        const outcome = await processIncomingMessage({
          channel,
          message: {
            externalId: mid,
            from: senderId,
            name: "Cliente Instagram",
            text: value.message.text,
          },
        });

        if (outcome.processed) {
          processed += 1;
        }
      } catch (error) {
        console.error(
          "[channel-webhook] instagram message error:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  return {
    processed,
  };
}
