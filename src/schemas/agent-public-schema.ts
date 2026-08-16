import { z } from "zod";

const PHONE_E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export const startPublicChatSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  email: z.string().trim().toLowerCase().email("Email inválido").max(200),
  phone: z
    .string()
    .trim()
    .regex(PHONE_E164_PATTERN, "El teléfono debe incluir indicativo de país, ej: +573001234567")
    .max(100),
  company: z.string().trim().max(200).optional(),
  topic: z.enum(
    ["PRICING", "PRODUCT_INFO", "SUPPORT", "DEMO", "OTHER"],
  ),
  initialMessage: z.string().trim().min(1).max(2000).optional(),
});

export const sendPublicMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const setPublicTypingSchema = z.object({
  isTyping: z.boolean(),
});

export type StartPublicChatInput = z.infer<typeof startPublicChatSchema>;
export type SendPublicMessageInput = z.infer<typeof sendPublicMessageSchema>;
export type SetPublicTypingInput = z.infer<typeof setPublicTypingSchema>;
