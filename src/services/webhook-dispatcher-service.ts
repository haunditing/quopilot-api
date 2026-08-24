import crypto from "node:crypto";
import { Channel } from "../models/Channel.js";

/**
 * Servicio de despacho de Webhooks para notificar eventos de chat
 * al servidor del cliente en tiempo real.
 *
 * Características:
 *  - Firma HMAC SHA-256 (`X-Quopilot-Signature`) por integridad.
 *  - Reintentos exponenciales (1s → 2s → 4s) ante fallos 5xx o timeout.
 *  - Fire-and-forget: no bloquea el flujo principal del chat.
 */

export type WebhookEventType = "chat.started" | "quote.completed";

export interface WebhookEventPayload {
  event: WebhookEventType;
  tenantId: string;
  channelId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DispatchTarget {
  url: string;
  secret: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

export class WebhookDispatcherService {
  /**
   * Despacha un evento a los webhooks configurados del tenant.
   *
   * Fire-and-forget: las llamadas se ejecutan en background sin
   * bloquear la respuesta HTTP del controller.
   */
  async dispatch(
    tenantId: string,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Resolución asíncrona de targets sin bloquear el caller.
    void this.resolveTargetsAndDispatch(tenantId, event, data);
  }

  private async resolveTargetsAndDispatch(
    tenantId: string,
    event: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const channels = await Channel.find({
        tenantId,
        status: "ACTIVE",
        webhookUrl: { $exists: true, $nin: [null, ""] },
      })
        .select("_id webhookUrl webhookSecret")
        .lean();

      if (!channels.length) return;

      const payload: WebhookEventPayload = {
        event,
        tenantId,
        channelId: String(data.channelId ?? ""),
        timestamp: new Date().toISOString(),
        data,
      };

      const body = JSON.stringify(payload);

      const deliveries = channels.map(async (ch) => {
        const secret =
          (ch as { webhookSecret?: string }).webhookSecret ?? "";
        await this.deliverWithRetry(ch.webhookUrl!, body, secret);
      });

      await Promise.allSettled(deliveries);
    } catch (error) {
      // Nunca propagar errores de webhook al flujo principal.
      console.error("[WebhookDispatcher] Error:", error);
    }
  }

  /** Envía el webhook con reintentos exponenciales ante 5xx/timeout. */
  private async deliverWithRetry(
    url: string,
    body: string,
    secret: string,
  ): Promise<void> {
    const signature = this.sign(body, secret);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          10_000,
        );

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Quopilot-Signature": signature,
            "User-Agent": "QuoPilot-Webhooks/1.0",
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) return;

        // Solo reintentar ante errores de servidor (5xx).
        if (res.status < 500) return;

        console.error(
          `[WebhookDispatcher] ${url} respondió ${res.status} (intento ${attempt + 1}/${MAX_RETRIES})`,
        );
      } catch (error) {
        console.error(
          `[WebhookDispatcher] Error enviando a ${url} (intento ${attempt + 1}/${MAX_RETRIES}):`,
          error instanceof Error ? error.message : error,
        );
      }

      // Backoff exponencial: 1s, 2s, 4s…
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /** Genera firma HMAC SHA-256 del body usando el secreto compartido. */
  private sign(body: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
  }

  /** Envío síncrono para testing (sin retry ni fire-and-forget). */
  async deliverNow(
    url: string,
    body: string,
    secret: string,
  ): Promise<{ ok: boolean; status?: number }> {
    const signature = this.sign(body, secret);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Quopilot-Signature": signature,
      },
      body,
    });

    return { ok: res.ok, status: res.status };
  }
}
