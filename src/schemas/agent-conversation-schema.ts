import { z } from "zod";

export const openConversationSchema = z.object({
  customerId: z.string().trim().min(1),
  channel: z.enum(["WEB_CHAT"]).default("WEB_CHAT"),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1),
});

export type OpenConversationInput = z.infer<typeof openConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
