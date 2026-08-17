import { Types } from "mongoose";
import { Agent } from "../models/Agent.js";
import { Customer } from "../models/Customer.js";
import { Message } from "../models/Message.js";
import { Tenant } from "../models/Tenant.js";
import {
  addMessage,
  closeConversation,
  getConversation,
  getConversationTyping,
  listMessages,
  openChannelConversation,
  setConversationTyping,
} from "./agent-conversation-service.js";
import { processInboundMessage } from "./agent-runtime-service.js";
import {
  getActiveChannelByType,
  getChannelWidgetConfig,
} from "./channel-query-service.js";
import { signPublicChatToken } from "../utils/public-chat-token.js";

export interface StartPublicChatInput {
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  topic?: string;
  initialMessage?: string;
}

function renderGreeting(template: string, customerName: string): string {
  return template
    .replace(/\{name\}/gi, customerName.trim())
    .replace(/\s+/g, " ")
    .replace(/\s+([!?,.;:])/g, "$1")
    .trim();
}

function sanitizeContent(content: string): string {
  return content
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

async function seedGreetingMessage(input: {
  tenantId: string;
  conversationId: string;
  customerId: string;
  greeting?: string;
  customerName?: string;
}): Promise<void> {
  const greeting = input.greeting?.trim();

  if (!greeting) {
    return;
  }

  const messageCount = await Message.countDocuments({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
  });

  if (messageCount > 0) {
    return;
  }

  await addMessage({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    customerId: input.customerId,
    direction: "OUTBOUND",
    senderType: "AI",
    content: renderGreeting(greeting, input.customerName ?? ""),
  });
}

export async function getPublicChatConfig(tenantId: string) {
  const tenant = await getActivePublicTenant(tenantId);

  const channel = await getActiveChannelByType(tenantId, "WEB_CHAT");

  return {
    tenantId,
    tenantName: tenant.name,
    channelName: channel?.name,
    widget: channel ? getChannelWidgetConfig(channel) : undefined,
  };
}

export async function getActivePublicTenant(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenant = await Tenant.findOne({
    _id: tenantId,
    status: "ACTIVE",
  }).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}

export async function startPublicChat(input: StartPublicChatInput) {
  const { tenantId, name, email, phone, company, initialMessage } = input;

  const tenant = await getActivePublicTenant(tenantId);

  const channel = await getActiveChannelByType(tenantId, "WEB_CHAT");

  if (!channel) {
    throw new Error("No web chat channel configured");
  }

  let customer = email
    ? await Customer.findOne({
        tenantId,
        email: email.toLowerCase(),
      }).lean()
    : null;

  if (!customer && phone) {
    customer = await Customer.findOne({
      tenantId,
      phone,
    }).lean();
  }

  if (!customer) {
    const [created] = await Customer.create([
      {
        tenantId,
        name: name?.trim() || "Cliente web",
        email: email?.toLowerCase(),
        phone,
        company: company?.trim() || undefined,
        isLead: true,
        metadata: input.topic
          ? {
              chatTopic: input.topic,
            }
          : undefined,
      },
    ]);

    customer = created.toObject();
  } else if (!customer.name && name?.trim()) {
    await Customer.updateOne(
      {
        _id: customer._id,
        tenantId,
      },
      {
        $set: {
          name: name.trim(),
        },
      },
    );
  }

  const agent = await Agent.findOne({
    tenantId,
    status: "ACTIVE",
  }).lean();

  const customerId = customer._id.toString();

  const conversation = await openChannelConversation({
    tenantId,
    channelId: channel._id.toString(),
    channel: "WEB_CHAT",
    customerId,
    externalConversationId: customerId,
    agentId: agent?._id.toString(),
  });

  const token = signPublicChatToken({
    tenantId,
    conversationId: conversation._id.toString(),
    customerId: customer._id.toString(),
  });

  let reply: string | undefined;

  await seedGreetingMessage({
    tenantId,
    conversationId: conversation._id.toString(),
    customerId,
    greeting: getChannelWidgetConfig(channel)?.greetingMessage,
    customerName: name,
  });

  if (initialMessage?.trim()) {
    const outcome = await processInboundMessage({
      tenantId,
      conversationId: conversation._id.toString(),
      content: initialMessage.trim(),
    });

    reply = outcome.reply;
  }

  return {
    tenantId,
    tenantName: tenant.name,
    channelId: channel._id.toString(),
    channelName: channel.name,
    conversationId: conversation._id.toString(),
    customerId: customer._id.toString(),
    token,
    reply,
    conversation,
  };
}

export async function getPublicMessages(input: {
  tenantId: string;
  conversationId: string;
  customerId: string;
}) {
  const { tenantId, conversationId, customerId } = input;

  await getConversation(tenantId, conversationId);

  const messages = await listMessages(tenantId, conversationId);

  return messages.filter(
    (message) =>
      message.customerId?.toString() === customerId ||
      message.senderType !== "CUSTOMER",
  );
}

export async function sendPublicMessage(input: {
  tenantId: string;
  conversationId: string;
  customerId: string;
  content: string;
}) {
  const { tenantId, conversationId, content } = input;

  const cleanContent = sanitizeContent(content);

  if (!cleanContent) {
    throw new Error("Message is empty");
  }

  return processInboundMessage({
    tenantId,
    conversationId,
    content: cleanContent,
  });
}

export async function getPublicTyping(input: {
  tenantId: string;
  conversationId: string;
}) {
  const { tenantId, conversationId } = input;

  return getConversationTyping(tenantId, conversationId);
}

export async function setPublicTyping(input: {
  tenantId: string;
  conversationId: string;
  isTyping: boolean;
}) {
  const { tenantId, conversationId, isTyping } = input;

  return setConversationTyping({
    tenantId,
    conversationId,
    senderType: "CUSTOMER",
    isTyping,
  });
}

export async function closePublicChat(input: {
  tenantId: string;
  conversationId: string;
}) {
  const { tenantId, conversationId } = input;

  return closeConversation({
    tenantId,
    conversationId,
    closedBy: "CUSTOMER",
  });
}
