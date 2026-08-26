import { z } from "zod";

export const channelTypeSchema = z.enum([
  "WHATSAPP",
  "WEB_CHAT",
  "INSTAGRAM",
]);

export const channelStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const channelCredentialsSchema = z.object({
  accessToken: z.string().trim().min(1).optional(),
  webhookSecret: z.string().trim().min(1).optional(),
  verifyToken: z.string().trim().min(1).optional(),
});

const whatsappConfigSchema = z.object({
  phoneNumber: z.string().trim().min(1),
  businessAccountId: z.string().trim().optional(),
  phoneNumberId: z.string().trim().optional(),
});

const instagramConfigSchema = z.object({
  instagramAccountId: z.string().trim().min(1),
  igUserId: z.string().trim().optional(),
  facebookPageId: z.string().trim().optional(),
});

const webChatConfigSchema = z.object({
  widget: z
    .object({
      title: z.string().trim().optional(),
      agentName: z.string().trim().min(1).max(100).optional(),
      companyName: z.string().trim().min(1).max(100).optional(),
      greetingMessage: z.string().trim().optional(),
      primaryColor: z.string().trim().optional(),
      position: z.enum(["bottom-right", "bottom-left"]).optional(),
    })
    .optional(),
});

export const createChannelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("WHATSAPP"),
    name: z.string().trim().min(1).max(100),
    agentId: z.string().trim().optional(),
    status: channelStatusSchema.optional(),
    config: whatsappConfigSchema,
    credentials: channelCredentialsSchema.optional(),
  }),
  z.object({
    type: z.literal("INSTAGRAM"),
    name: z.string().trim().min(1).max(100),
    agentId: z.string().trim().optional(),
    status: channelStatusSchema.optional(),
    config: instagramConfigSchema,
    credentials: channelCredentialsSchema.optional(),
  }),
  z.object({
    type: z.literal("WEB_CHAT"),
    name: z.string().trim().min(1).max(100),
    agentId: z.string().trim().optional(),
    status: channelStatusSchema.optional(),
    config: webChatConfigSchema.optional(),
  }),
]);

export const updateChannelConfigSchema = z.object({
  phoneNumber: z.string().trim().min(1).optional(),
  businessAccountId: z.string().trim().optional(),
  phoneNumberId: z.string().trim().optional(),
  instagramAccountId: z.string().trim().min(1).optional(),
  igUserId: z.string().trim().optional(),
  facebookPageId: z.string().trim().optional(),
  widget: z
    .object({
      title: z.string().trim().optional(),
      agentName: z.string().trim().min(1).max(100).optional(),
      companyName: z.string().trim().min(1).max(100).optional(),
      greetingMessage: z.string().trim().optional(),
      primaryColor: z.string().trim().optional(),
      position: z.enum(["bottom-right", "bottom-left"]).optional(),
    })
    .optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: channelStatusSchema.optional(),
  config: updateChannelConfigSchema.optional(),
  credentials: channelCredentialsSchema.optional(),
});

export const updateChannelStatusSchema = z.object({
  status: channelStatusSchema,
});

export type ChannelType = z.infer<typeof channelTypeSchema>;
export type ChannelStatus = z.infer<typeof channelStatusSchema>;
export type ChannelCredentialsInput = z.infer<
  typeof channelCredentialsSchema
>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
