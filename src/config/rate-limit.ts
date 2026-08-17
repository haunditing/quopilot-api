import { rateLimit } from "express-rate-limit";

const standardHeaders = true;
const legacyHeaders = false;

export const publicChatStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders,
  legacyHeaders,
  message: {
    message: "Demasiados intentos de iniciar chat. Inténtalo más tarde.",
  },
});

export const publicChatSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders,
  legacyHeaders,
  message: {
    message: "Demasiados mensajes en poco tiempo. Espera un momento.",
  },
});

export const publicChatTypingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders,
  legacyHeaders,
  message: {
    message: "Demasiadas actualizaciones de escritura. Espera un momento.",
  },
});

export const publicChatReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders,
  legacyHeaders,
  message: {
    message: "Demasiadas solicitudes. Espera un momento.",
  },
});