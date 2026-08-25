import type { Request, Response } from "express";
import { CHAT_WIDGET_JS } from "../services/chat-widget.js";

/** GET /api/public/chat-widget.js — público, sirve el widget del chat comercial. */
export function getChatWidgetController(_req: Request, res: Response): void {
  res
    .status(200)
    .setHeader("Content-Type", "application/javascript; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=3600")
    .send(CHAT_WIDGET_JS);
}
