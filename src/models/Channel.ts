import mongoose, { Document, Schema, Types } from "mongoose";
import type { EncryptedValue } from "../utils/encryption.js";

export type ChannelType = "WHATSAPP" | "WEB_CHAT" | "INSTAGRAM";

export type ChannelStatus = "ACTIVE" | "INACTIVE";

export type ChatWidgetPosition = "bottom-right" | "bottom-left";

export interface ChatWidgetConfig {
  title?: string;
  greetingMessage?: string;
  primaryColor?: string;
  position?: ChatWidgetPosition;
}

export interface IChannelConfig {
  phoneNumber?: string;
  businessAccountId?: string;
  phoneNumberId?: string;

  instagramAccountId?: string;
  igUserId?: string;
  facebookPageId?: string;

  widget?: ChatWidgetConfig;
}

export interface ChannelCredentials {
  accessToken?: string;
  webhookSecret?: string;
  verifyToken?: string;
}

export interface IChannelCredentialsStored {
  accessToken?: EncryptedValue;
  webhookSecret?: EncryptedValue;
  verifyToken?: EncryptedValue;
}

export interface IChannel extends Document {
  tenantId: Types.ObjectId;
  agentId: Types.ObjectId;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  config: IChannelConfig;
  credentials: IChannelCredentialsStored;
  createdAt: Date;
  updatedAt: Date;
}

const chatWidgetConfigSchema = new Schema<ChatWidgetConfig>(
  {
    title: {
      type: String,
      trim: true,
    },

    greetingMessage: {
      type: String,
      trim: true,
    },

    primaryColor: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
    },
  },
  {
    _id: false,
  },
);

const channelConfigSchema = new Schema<IChannelConfig>(
  {
    phoneNumber: {
      type: String,
      trim: true,
    },

    businessAccountId: {
      type: String,
      trim: true,
    },

    phoneNumberId: {
      type: String,
      trim: true,
    },

    instagramAccountId: {
      type: String,
      trim: true,
    },

    igUserId: {
      type: String,
      trim: true,
    },

    facebookPageId: {
      type: String,
      trim: true,
    },

    widget: {
      type: chatWidgetConfigSchema,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const encryptedValueSchema = new Schema<EncryptedValue>(
  {
    algorithm: {
      type: String,
      required: true,
    },

    keyVersion: {
      type: String,
      required: true,
    },

    iv: {
      type: String,
      required: true,
    },

    tag: {
      type: String,
      required: true,
    },

    ciphertext: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const channelCredentialsSchema = new Schema<IChannelCredentialsStored>(
  {
    accessToken: {
      type: encryptedValueSchema,
    },

    webhookSecret: {
      type: encryptedValueSchema,
    },

    verifyToken: {
      type: encryptedValueSchema,
    },
  },
  {
    _id: false,
  },
);

const channelSchema = new Schema<IChannel>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["WHATSAPP", "WEB_CHAT", "INSTAGRAM"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    config: {
      type: channelConfigSchema,
      default: () => ({}),
    },

    credentials: {
      type: channelCredentialsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

channelSchema.index({
  tenantId: 1,
  status: 1,
});

channelSchema.index({
  tenantId: 1,
  agentId: 1,
});

channelSchema.index({
  tenantId: 1,
  type: 1,
});

export const Channel = mongoose.model<IChannel>("Channel", channelSchema);
