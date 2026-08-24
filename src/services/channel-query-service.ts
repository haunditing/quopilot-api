import { Types } from "mongoose";
import { Channel } from "../models/Channel.js";
import { PublicChannelService } from "./PublicChannelService.js";
import type {
  ChannelCredentials,
  ChannelStatus,
  ChannelType,
  ChatWidgetConfig,
  IChannelConfig,
  IChannelCredentialsStored,
} from "../models/Channel.js";
import { decryptSecret } from "../utils/encryption.js";

export interface ChannelLike {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  agentId: Types.ObjectId;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  publicToken?: string;
  config: IChannelConfig;
  credentials: IChannelCredentialsStored;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicChannel {
  id: string;
  publicToken?: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  agentId: string;
  config: IChannelConfig;
  credentialsConfigured: {
    accessToken: boolean;
    webhookSecret: boolean;
    verifyToken: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RuntimeChannel {
  id: string;
  tenantId: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  agentId: string;
  config: IChannelConfig;
  credentials: ChannelCredentials;
}

function assertValidId(id: string, label: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

export async function getChannelById(
  tenantId: string,
  channelId: string,
): Promise<ChannelLike> {
  assertValidId(tenantId, "tenantId");
  assertValidId(channelId, "channelId");

  const channel = await Channel.findOne({
    _id: new Types.ObjectId(channelId),
    tenantId: new Types.ObjectId(tenantId),
  }).lean();

  if (!channel) {
    throw new Error("Channel not found");
  }

  // Backfill perezoso: token público para widgets WebChat creados
  // antes de la migración (escritura idempotente y acotada).
  if (
    channel.type === "WEB_CHAT" &&
    channel.status === "ACTIVE" &&
    !channel.publicToken
  ) {
    const publicToken = new PublicChannelService().generateWebChatToken();

    await Channel.updateOne(
      { _id: channel._id },
      { $set: { publicToken } },
    );

    channel.publicToken = publicToken;
  }

  return channel;
}

export async function getChannelByIdUnscoped(
  channelId: string,
): Promise<ChannelLike | null> {
  assertValidId(channelId, "channelId");

  const channel = await Channel.findOne({
    _id: new Types.ObjectId(channelId),
  }).lean();

  return (channel as ChannelLike) ?? null;
}

interface ListChannelsInput {
  tenantId: string;
  page: number;
  limit: number;
  type?: ChannelType;
  status?: ChannelStatus;
  agentId?: string;
}

export async function listChannels(input: ListChannelsInput) {
  const { tenantId, page, limit, type, status, agentId } = input;

  assertValidId(tenantId, "tenantId");

  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
  };

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  if (agentId) {
    assertValidId(agentId, "agentId");

    filter.agentId = new Types.ObjectId(agentId);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Channel.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),
    Channel.countDocuments(filter),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data: data as ChannelLike[],
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getActiveChannels(
  tenantId: string,
  type?: ChannelType,
): Promise<ChannelLike[]> {
  assertValidId(tenantId, "tenantId");

  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    status: "ACTIVE",
  };

  if (type) {
    filter.type = type;
  }

  const channels = await Channel.find(filter)
    .sort({
      createdAt: 1,
    })
    .lean();

  return channels as ChannelLike[];
}

export async function getActiveChannelByType(
  tenantId: string,
  type: ChannelType,
): Promise<ChannelLike | null> {
  const channels = await getActiveChannels(tenantId, type);

  return channels[0] ?? null;
}

export function toPublicChannel(channel: ChannelLike): PublicChannel {
  return {
    id: channel._id.toString(),
    publicToken: channel.publicToken,
    type: channel.type,
    name: channel.name,
    status: channel.status,
    agentId: channel.agentId.toString(),
    config: channel.config,
    credentialsConfigured: {
      accessToken: Boolean(channel.credentials?.accessToken),
      webhookSecret: Boolean(channel.credentials?.webhookSecret),
      verifyToken: Boolean(channel.credentials?.verifyToken),
    },
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}

export function toRuntimeChannel(channel: ChannelLike): RuntimeChannel {
  const credentials: ChannelCredentials = {};

  if (channel.credentials?.accessToken) {
    credentials.accessToken = decryptSecret(channel.credentials.accessToken);
  }

  if (channel.credentials?.webhookSecret) {
    credentials.webhookSecret = decryptSecret(channel.credentials.webhookSecret);
  }

  if (channel.credentials?.verifyToken) {
    credentials.verifyToken = decryptSecret(channel.credentials.verifyToken);
  }

  return {
    id: channel._id.toString(),
    tenantId: channel.tenantId.toString(),
    type: channel.type,
    name: channel.name,
    status: channel.status,
    agentId: channel.agentId.toString(),
    config: channel.config,
    credentials,
  };
}

export function getChannelWidgetConfig(
  channel: ChannelLike,
): ChatWidgetConfig | undefined {
  return channel.type === "WEB_CHAT" ? channel.config?.widget : undefined;
}
