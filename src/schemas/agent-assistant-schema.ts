import { z } from "zod";

export const assistantIdSchema = z.string().trim().min(1);

export const sendAssistantMessageSchema = z.object({
  content: z.string().trim().min(1),
});

export type SendAssistantMessageInput = z.infer<
  typeof sendAssistantMessageSchema
>;
