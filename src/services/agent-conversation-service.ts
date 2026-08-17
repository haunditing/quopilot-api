import { Types } from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { ConversationState } from "../models/ConversationState.js";
import type { ConversationTypingSender } from "../models/ConversationState.js";
import { Customer } from "../models/Customer.js";
import { Message } from "../models/Message.js";
import { AgentEvent } from "../models/AgentEvent.js";
import { User } from "../models/User.js";
import type {
  MessageDirection,
  MessageSenderType,
  MessageStatus,
} from "../models/Message.js";
import type { ConversationChannel } from "../models/Conversation.js";
import {
  getChannelById,
  toRuntimeChannel,
} from "./channel-query-service.js";
import { sendChannelReply } from "./channel-sender-service.js";

function assertValidId(id: string, label: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

interface OpenConversationInput {
  tenantId: string;
  customerId: string;
  channel: ConversationChannel;
  agentId?: string;
}

export async function openConversation(input: OpenConversationInput) {
  const { tenantId, customerId, channel, agentId } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(customerId, "customerId");

  const existing = await Conversation.findOne({
    tenantId,
    customerId,
    channel,
    status: "OPEN",
  }).lean();

  if (existing) {
    return existing;
  }

  const [conversation] = await Conversation.create([
    {
      tenantId,
      customerId,
      channel,
      agentId: agentId ? new Types.ObjectId(agentId) : undefined,
    },
  ]);

  await ConversationState.create({
    tenantId,
    conversationId: conversation._id,
  });

  return conversation.toObject();
}

interface OpenChannelConversationInput {
  tenantId: string;
  channelId: string;
  channel: ConversationChannel;
  customerId: string;
  externalConversationId: string;
  agentId?: string;
}

export async function openChannelConversation(
  input: OpenChannelConversationInput,
) {
  const {
    tenantId,
    channelId,
    channel,
    customerId,
    externalConversationId,
    agentId,
  } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(channelId, "channelId");
  assertValidId(customerId, "customerId");

  const existing = await Conversation.findOne({
    tenantId,
    channelId: new Types.ObjectId(channelId),
    externalConversationId,
    status: "OPEN",
  }).lean();

  if (existing) {
    return existing;
  }

  const [conversation] = await Conversation.create([
    {
      tenantId,
      customerId,
      channel,
      channelId: new Types.ObjectId(channelId),
      externalConversationId,
      agentId: agentId ? new Types.ObjectId(agentId) : undefined,
    },
  ]);

  await ConversationState.create({
    tenantId,
    conversationId: conversation._id,
  });

  return conversation.toObject();
}

interface ListConversationsInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: "OPEN" | "CLOSED";
  channelId?: string;
  channel?: ConversationChannel;
  userId?: string;
}

export async function listConversations(input: ListConversationsInput) {
  const { tenantId, page, limit, status, channelId, channel, userId } = input;

  assertValidId(tenantId, "tenantId");

  const filter: Record<string, unknown> = {
    tenantId,
  };

  if (userId) {
    assertValidId(userId, "userId");
    filter.assignedTo = new Types.ObjectId(userId);
  }

  if (status) {
    filter.status = status;
  }

  if (channelId) {
    assertValidId(channelId, "channelId");

    filter.channelId = new Types.ObjectId(channelId);
  }

  if (channel) {
    filter.channel = channel;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Conversation.find(filter)
      .sort({
        lastMessageAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Conversation.countDocuments(filter),
  ]);

  const conversationIds = data.map((conversation) => conversation._id);

  const [customers, latestMessages, assignees] = await Promise.all([
    Customer.find({
      tenantId,
      _id: {
        $in: data.map((conversation) => conversation.customerId),
      },
    })
      .select({
        name: 1,
        phone: 1,
        email: 1,
      })
      .lean(),

    Message.find({
      tenantId,
      conversationId: {
        $in: conversationIds,
      },
    })
      .sort({
        createdAt: -1,
      })
      .limit(data.length * 10)
      .lean(),

    User.find({
      tenantId,
      _id: {
        $in: data
          .map((conversation) => conversation.assignedTo)
          .filter((id): id is NonNullable<typeof id> => Boolean(id)),
      },
    })
      .select({
        name: 1,
      })
      .lean(),
  ]);

  const customerMap = new Map(
    customers.map((customer) => [customer._id.toString(), customer]),
  );

  const assigneeMap = new Map(
    assignees.map((user) => [user._id.toString(), user.name]),
  );

  const latestMessageMap = new Map<string, (typeof latestMessages)[number]>();

  for (const message of latestMessages) {
    const key = message.conversationId.toString();

    if (!latestMessageMap.has(key)) {
      latestMessageMap.set(key, message);
    }
  }

  const enrichedData = data.map((conversation) => {
    const customer = customerMap.get(conversation.customerId.toString());
    const latestMessage = latestMessageMap.get(conversation._id.toString());

    return {
      ...conversation,
      customer: customer
        ? {
            id: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          }
        : undefined,
      assignedAgentName: conversation.assignedTo
        ? (assigneeMap.get(conversation.assignedTo.toString()) ?? undefined)
        : undefined,
      lastMessage: latestMessage
        ? {
            content: latestMessage.content,
            direction: latestMessage.direction,
            senderType: latestMessage.senderType,
            createdAt: latestMessage.createdAt,
          }
        : undefined,
    };
  });

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data: enrichedData,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getConversation(
  tenantId: string,
  conversationId: string,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId,
  }).lean();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

interface AddMessageInput {
  tenantId: string;
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  senderType: MessageSenderType;
  content: string;
  status?: MessageStatus;
  externalMessageId?: string;
  metadata?: Record<string, unknown>;
}

export async function addMessage(input: AddMessageInput) {
  const {
    tenantId,
    conversationId,
    customerId,
    direction,
    senderType,
    content,
    status,
    externalMessageId,
    metadata,
  } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");
  assertValidId(customerId, "customerId");

  const conversation = await getConversation(tenantId, conversationId);

  const [message] = await Message.create([
    {
      tenantId,
      conversationId,
      customerId,
      direction,
      senderType,
      content,
      status: status ?? (direction === "INBOUND" ? "RECEIVED" : "SENT"),
      externalMessageId,
      metadata,
    },
  ]);

  await Promise.all([
    Conversation.updateOne(
      {
        _id: conversationId,
        tenantId,
      },
      {
        $set: {
          lastMessageAt: new Date(),
          agentId: conversation.agentId,
        },
      },
    ),

    ConversationState.updateOne(
      {
        conversationId,
        tenantId,
      },
      {
        $inc: {
          messageCount: 1,
        },
        $set: {
          lastTurnAt: new Date(),
        },
        $setOnInsert: {
          tenantId,
        },
      },
      {
        upsert: true,
      },
    ),
  ]);

  return message.toObject();
}

export async function closeConversation(input: {
  tenantId: string;
  conversationId: string;
  closedBy: "CUSTOMER" | "AGENT" | "SYSTEM";
}) {
  const { tenantId, conversationId, closedBy } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  const conversation = await getConversation(tenantId, conversationId);

  if (conversation.status === "CLOSED") {
    throw new Error("Conversation is closed");
  }

  await Promise.all([
    Conversation.updateOne(
      {
        _id: conversationId,
        tenantId,
      },
      {
        $set: {
          status: "CLOSED",
        },
        $unset: {
          assignedTo: "",
          assignedAt: "",
        },
      },
    ),

    ConversationState.updateOne(
      {
        tenantId,
        conversationId,
      },
      {
        $unset: {
          "context.typingBy": "",
          "context.typingAt": "",
        },
      },
    ),

    AgentEvent.create({
      tenantId,
      conversationId,
      customerId: conversation.customerId,
      type: "CONVERSATION_CLOSED",
      data: {
        closedBy,
      },
    }),
  ]);

  return getConversation(tenantId, conversationId);
}

export async function listMessages(
  tenantId: string,
  conversationId: string,
  limit = 50,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  await getConversation(tenantId, conversationId);

  return Message.find({
    tenantId,
    conversationId,
  })
    .sort({
      createdAt: 1,
    })
    .limit(limit)
    .lean();
}

const TYPING_TTL_MS = 8000;

export async function setConversationTyping(input: {
  tenantId: string;
  conversationId: string;
  senderType: ConversationTypingSender;
  isTyping: boolean;
}) {
  const { tenantId, conversationId, senderType, isTyping } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  await getConversation(tenantId, conversationId);

  if (isTyping) {
    await ConversationState.updateOne(
      {
        tenantId,
        conversationId,
      },
      {
        $set: {
          "context.typingBy": senderType,
          "context.typingAt": new Date(),
        },
      },
      {
        upsert: true,
      },
    );

    return;
  }

  await ConversationState.updateOne(
    {
      tenantId,
      conversationId,
      "context.typingBy": senderType,
    },
    {
      $unset: {
        "context.typingBy": "",
        "context.typingAt": "",
      },
    },
  );
}

export async function getConversationTyping(
  tenantId: string,
  conversationId: string,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  const conversation = await getConversation(tenantId, conversationId);

  const state = await ConversationState.findOne({
    tenantId,
    conversationId,
  }).lean();

  const typingAt = state?.context?.typingAt;
  const typingBy = state?.context?.typingBy;

  const isTyping =
    typingBy != null &&
    typingAt != null &&
    Date.now() - typingAt.getTime() < TYPING_TTL_MS;

  return {
    isTyping,
    senderType: isTyping ? typingBy : undefined,
    escalated: state?.context?.pendingAction === "HANDOFF",
    status: conversation.status,
  };
}

export const NO_AGENTS_REPLY =
  "Lo sentimos, en este momento no tenemos agentes disponibles para atenderte. " +
  "Por favor déjanos tu mensaje o contacto y te responderemos a la brevedad.";

export async function hasAvailableHumanAgents(
  tenantId: string,
): Promise<boolean> {
  assertValidId(tenantId, "tenantId");

  const count = await User.countDocuments({
    tenantId: new Types.ObjectId(tenantId),
    status: "ACTIVE",
    role: {
      $in: ["AGENT", "TENANT_ADMIN"],
    },
  });

  return count > 0;
}

async function listHumanAgents(tenantId: string) {
  return User.find({
    tenantId: new Types.ObjectId(tenantId),
    status: "ACTIVE",
    role: {
      $in: ["AGENT", "TENANT_ADMIN"],
    },
  })
    .sort({
      createdAt: 1,
      _id: 1,
    })
    .lean();
}

export async function pickNextAgentByRoundRobin(
  tenantId: string,
): Promise<{ id: string; name: string } | null> {
  const agents = await listHumanAgents(tenantId);

  if (agents.length === 0) {
    return null;
  }

  if (agents.length === 1) {
    return {
      id: agents[0]._id.toString(),
      name: agents[0].name,
    };
  }

  const lastAssigned = await Conversation.findOne({
    tenantId: new Types.ObjectId(tenantId),
    assignedTo: {
      $exists: true,
      $ne: null,
    },
  })
    .sort({
      assignedAt: -1,
      updatedAt: -1,
    })
    .lean();

  if (!lastAssigned?.assignedTo) {
    return {
      id: agents[0]._id.toString(),
      name: agents[0].name,
    };
  }

  const lastIndex = agents.findIndex(
    (agent) => agent._id.toString() === lastAssigned.assignedTo!.toString(),
  );

  const next = agents[(lastIndex + 1) % agents.length];

  return {
    id: next._id.toString(),
    name: next.name,
  };
}

const UNASSIGNED_FILTER = {
  $or: [
    {
      assignedTo: {
        $exists: false,
      },
    },
    {
      assignedTo: null,
    },
  ],
};

export async function assignConversationToNextAgent(input: {
  tenantId: string;
  conversationId: string;
  reason?: string;
}): Promise<{ id: string; name: string } | null> {
  const { tenantId, conversationId, reason } = input;

  const agent = await pickNextAgentByRoundRobin(tenantId);

  if (!agent) {
    return null;
  }

  const now = new Date();

  const claimed = await Conversation.findOneAndUpdate(
    {
      _id: new Types.ObjectId(conversationId),
      tenantId: new Types.ObjectId(tenantId),
      status: "OPEN",
      ...UNASSIGNED_FILTER,
    },
    {
      $set: {
        assignedTo: new Types.ObjectId(agent.id),
        assignedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!claimed) {
    return null;
  }

  const conversation = await getConversation(tenantId, conversationId);

  await AgentEvent.create({
    tenantId,
    conversationId,
    customerId: conversation.customerId,
    type: "CONVERSATION_ASSIGNED",
    data: {
      assignedTo: agent.id,
      agentName: agent.name,
      reason: reason?.trim() || undefined,
    },
  });

  return agent;
}

export async function claimConversationForAgent(input: {
  tenantId: string;
  conversationId: string;
  userId: string;
}): Promise<boolean> {
  const { tenantId, conversationId, userId } = input;

  const now = new Date();

  const claimed = await Conversation.findOneAndUpdate(
    {
      _id: new Types.ObjectId(conversationId),
      tenantId: new Types.ObjectId(tenantId),
      status: "OPEN",
      ...UNASSIGNED_FILTER,
    },
    {
      $set: {
        assignedTo: new Types.ObjectId(userId),
        assignedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  return Boolean(claimed);
}

export async function requestHumanHandoff(
  tenantId: string,
  conversationId: string,
  customerId: string,
  reason?: string,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");
  assertValidId(customerId, "customerId");

  const conversation = await getConversation(tenantId, conversationId);

  if (conversation.status !== "OPEN") {
    throw new Error("Conversation is closed");
  }

  if (!(await hasAvailableHumanAgents(tenantId))) {
    return {
      conversationId,
      message: NO_AGENTS_REPLY,
    };
  }

  await ConversationState.updateOne(
    {
      conversationId,
      tenantId,
    },
    {
      $set: {
        "context.pendingAction": "HANDOFF",
      },
    },
    {
      upsert: true,
    },
  );

  await AgentEvent.create({
    tenantId,
    conversationId,
    customerId,
    type: "HANDOFF_REQUESTED",
    data: {
      reason: reason?.trim() || undefined,
    },
  });

  const assignedAgent = await assignConversationToNextAgent({
    tenantId,
    conversationId,
    reason: reason?.trim() || undefined,
  });

  return {
    conversationId,
    assignedTo: assignedAgent?.id,
    message: assignedAgent
      ? `Se ha solicitado la intervención de un agente humano. ${assignedAgent.name} te atenderá pronto.`
      : "Se ha solicitado la intervención de un agente humano. Un asesor te contactará pronto.",
  };
}

export async function linkQuoteDraftToConversation(
  tenantId: string,
  conversationId: string,
  quoteId: string,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");
  assertValidId(quoteId, "quoteId");

  await getConversation(tenantId, conversationId);

  await ConversationState.updateOne(
    {
      conversationId,
      tenantId,
    },
    {
      $set: {
        "context.quoteDraftId": new Types.ObjectId(quoteId),
        "context.pendingAction": "CONFIRM_QUOTE",
      },
    },
    {
      upsert: true,
    },
  );
}

export async function replyToConversation(input: {
  tenantId: string;
  conversationId: string;
  content: string;
  agentUserId?: string;
}): Promise<{
  message: {
    id: string;
    content: string;
    createdAt: Date;
  };
  delivered: boolean;
}> {
  const { tenantId, conversationId, content, agentUserId } = input;

  assertValidId(tenantId, "tenantId");
  assertValidId(conversationId, "conversationId");

  const conversation = await getConversation(tenantId, conversationId);

  if (conversation.status !== "OPEN") {
    throw new Error("Conversation is closed");
  }

  if (agentUserId) {
    const currentAssignee = conversation.assignedTo?.toString();

    if (currentAssignee && currentAssignee !== agentUserId) {
      throw new Error("Conversation is assigned to another agent");
    }

    if (!currentAssignee) {
      const claimed = await claimConversationForAgent({
        tenantId,
        conversationId,
        userId: agentUserId,
      });

      if (!claimed) {
        throw new Error("Conversation is assigned to another agent");
      }
    }
  }

  const message = await addMessage({
    tenantId,
    conversationId,
    customerId: conversation.customerId.toString(),
    direction: "OUTBOUND",
    senderType: "AGENT",
    content,
  });

  let delivered = true;

  if (conversation.channelId && conversation.externalConversationId) {
    try {
      const channel = await getChannelById(
        tenantId,
        conversation.channelId.toString(),
      );

      if (channel.type === "WHATSAPP" || channel.type === "INSTAGRAM") {
        const result = await sendChannelReply({
          channel: toRuntimeChannel(channel),
          to: conversation.externalConversationId,
          text: content,
        });

        delivered = result.delivered;
      }
    } catch (error) {
      console.error(
        "[conversation-reply] channel send failed:",
        error instanceof Error ? error.message : error,
      );

      delivered = false;
    }
  }

  return {
    message: {
      id: message._id.toString(),
      content: message.content,
      createdAt: message.createdAt,
    },
    delivered,
  };
}
