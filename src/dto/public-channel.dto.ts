import type { Types } from "mongoose";

/**
 * Capa de DTOs para el canal público WebChat.
 *
 * Estos contratos son la frontera entre el mundo exterior (redes
 * sociales, navegadores, iframe embebido) y el dominio interno.
 */

/** Formato canónico del token público del widget. */
export const PUBLIC_CHANNEL_TOKEN_PATTERN = /^qp_live_[a-f0-9]{32}$/;

export function isPublicChannelToken(value: string): boolean {
  return PUBLIC_CHANNEL_TOKEN_PATTERN.test(value);
}

/**
 * Resultado de la resolución token → tenant/canal.
 * `null` representa "no encontrado o inactivo" (fail-closed).
 */
export interface ChannelResolution {
  readonly channel: {
    readonly id: string;
    readonly name: string;
    readonly publicToken: string;
    readonly widget: {
      title?: string;
      greetingMessage?: string;
      primaryColor?: string;
      position: "bottom-right" | "bottom-left";
    };
  };
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly logoUrl?: string;
    readonly brandColor?: string;
    readonly status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
}

/** Configuración pública expuesta por `GET /api/v1/public/channels/:token`. */
export interface PublicChannelConfigDTO {
  readonly token: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly logoUrl?: string;
  /** Color primario efectivo (widget → tenant). */
  readonly primaryColor?: string;
  /** Mensaje de bienvenida efectivo (widget → tenant). */
  readonly welcomeMessage?: string;
  readonly position: "bottom-right" | "bottom-left";
}

/** Metadatos OpenGraph para vistas previas en redes sociales. */
export interface OpenGraphMetadataDTO {
  readonly title: string;
  readonly description: string;
  readonly image?: string;
  readonly url: string;
  readonly type: "website";
}
