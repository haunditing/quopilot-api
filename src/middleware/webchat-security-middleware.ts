import type { NextFunction, Request, Response } from "express";

/**
 * Middleware de seguridad para endpoints públicos del widget WebChat.
 *
 * - `Content-Security-Policy: frame-ancestors *` permite que el iframe sea
 *   embebido por cualquier sitio externo.
 * - `X-Content-Type-Options` y `Referrer-Policy` endurecen la respuesta
 *   sin afectar la funcionalidad.
 *
 * El CORS público (`Access-Control-Allow-Origin: *`) se habilita SOLO en el
 * endpoint de configuración mediante `{ publicCors: true }`, evitando
 * ampliar el alcance a otros endpoints.
 */
export function webchatSecurityHeaders(options?: {
  /** Habilita CORS público (ACAO: *) — usar únicamente en el endpoint de configuración. */
  publicCors?: boolean;
}) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Permitir embebido en cualquier sitio externo.
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors *",
    );

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

    if (options?.publicCors) {
      // Defensivo: no duplicar si otro middleware ya fijó el origen.
      if (!res.getHeader("Access-Control-Allow-Origin")) {
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    }

    next();
  };
}

/**
 * Variante estricta para la página SSR (`/c/:token`): sin CORS público,
 * solo las cabeceras mínimas de seguridad y embebido por iframe.
 */
export const webchatSsrSecurityHeaders = webchatSecurityHeaders();
