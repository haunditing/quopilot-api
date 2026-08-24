import { Types } from "mongoose";
import { PublicChannelService } from "./PublicChannelService.js";
import { Channel } from "../models/Channel.js";
import type {
  ChannelCredentials,
  IChannel,
  IChannelCredentialsStored,
} from "../models/Channel.js";
import type {
  ChannelStatus,
  CreateChannelInput,
  UpdateChannelInput,
} from "../schemas/channel-schema.js";
import { getAgentByTenant } from "./agent-service.js";
import { encryptSecret } from "../utils/encryption.js";

function assertValidId(id: string, label: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

function encryptCredentials(
  credentials?: ChannelCredentials,
): IChannelCredentialsStored {
  const stored: IChannelCredentialsStored = {};

  if (credentials?.accessToken) {
    stored.accessToken = encryptSecret(credentials.accessToken);
  }

  if (credentials?.webhookSecret) {
    stored.webhookSecret = encryptSecret(credentials.webhookSecret);
  }

  if (credentials?.verifyToken) {
    stored.verifyToken = encryptSecret(credentials.verifyToken);
  }

  return stored;
}

export async function createChannel(
  tenantId: string,
  input: CreateChannelInput,
): Promise<IChannel> {
  assertValidId(tenantId, "tenantId");

  let agentId: Types.ObjectId;

  if (input.agentId) {
    assertValidId(input.agentId, "agentId");

    agentId = new Types.ObjectId(input.agentId);
  } else {
    const agent = await getAgentByTenant(tenantId);

    if (!agent) {
      throw new Error("No agent configured for this tenant");
    }

    agentId = agent._id;
  }

  const credentials =
    "credentials" in input ? input.credentials : undefined;

  const channelService = new PublicChannelService();

  // Validación de duplicados por tenant (nombre + tipo).
  const duplicate = await Channel.findOne({
    tenantId: new Types.ObjectId(tenantId),
    name: input.name.trim(),
    type: input.type,
  })
    .select("_id")
    .lean();

  if (duplicate) {
    throw new Error("Channel already exists");
  }

  const [channel] = await Channel.create([
    {
      tenantId,
      agentId,
      type: input.type,
      name: input.name,
      status: input.status ?? "ACTIVE",
      config: input.config,
      credentials: encryptCredentials(credentials),
      // Token público para el widget WebChat (qp_live_xxx).
      ...(input.type === "WEB_CHAT"
        ? { publicToken: channelService.generateWebChatToken() }
        : {}),
    },
  ]);

  return channel;
}

export async function updateChannel(
  tenantId: string,
  channelId: string,
  input: UpdateChannelInput,
): Promise<IChannel> {
  assertValidId(tenantId, "tenantId");
  assertValidId(channelId, "channelId");

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    update.name = input.name;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  if (input.config) {
    for (const [key, value] of Object.entries(input.config)) {
      update[`config.${key}`] = value;
    }
  }

  if (input.credentials) {
    const encrypted = encryptCredentials(input.credentials);

    for (const [key, value] of Object.entries(encrypted)) {
      update[`credentials.${key}`] = value;
    }
  }

  const channel = await Channel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(channelId),
      tenantId: new Types.ObjectId(tenantId),
    },
    {
      $set: update,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();

  if (!channel) {
    throw new Error("Channel not found");
  }

  return channel as IChannel;
}

export async function setChannelStatus(
  tenantId: string,
  channelId: string,
  status: ChannelStatus,
): Promise<IChannel> {
  return updateChannel(tenantId, channelId, {
    status,
  });
}

export async function deleteChannel(
  tenantId: string,
  channelId: string,
): Promise<{ id: string }> {
  assertValidId(tenantId, "tenantId");
  assertValidId(channelId, "channelId");

  const channel = await Channel.findOneAndDelete({
    _id: new Types.ObjectId(channelId),
    tenantId: new Types.ObjectId(tenantId),
  });

  if (!channel) {
    throw new Error("Channel not found");
  }

  return {
    id: channelId,
  };
}
