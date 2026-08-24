import crypto from "node:crypto";
import type { Types } from "mongoose";
import { Channel } from "../models/Channel.js";
import { Tenant } from "../models/Tenant.js";
import {
  isPublicChannelToken,
  type ChannelResolution,
  type OpenGraphMetadataDTO,
  type PublicChannelConfigDTO,
} from "../dto/public-channel.dto.js";

const TOKEN_PREFIX = "qp_live_";
const TOKEN_RANDOM_BYTES = 16;

/**
 * Servicio de dominio para la resolución de canales WebChat públicos.
 *
 * Responsabilidades:
 *  - Resolver la configuración del tenant a partir del token público.
 *  - Generar tokens `qp_live_xxx` con formato canónico.
 *  - Construir los metadatos OpenGraph para vistas previas.
 *
 * Diseño defensivo: cualquier canal inexistente, inactivo o que no sea
 * WEB_CHAT resuelve a `null` (fail-closed), nunca lanza al exterior.
 */
export class PublicChannelService {
  /** URL base de producción para enlaces standalone (redes sociales). */
  readonly appBaseUrl: string =
    process.env.APP_BASE_URL ?? "https://www.quopilot.com";

  /** URL base del CDN donde se sirve el widget.js. */
  readonly cdnBaseUrl: string =
    process.env.CDN_BASE_URL ?? this.appBaseUrl;

  /** Valida el formato del token sin tocar la base de datos. */
  isValidToken(token: string): boolean {
    return isPublicChannelToken(token);
  }

  /** Genera un token nuevo con formato `qp_live_<32 hex>`. */
  generateWebChatToken(): string {
    return TOKEN_PREFIX + crypto.randomBytes(TOKEN_RANDOM_BYTES).toString("hex");
  }

  /**
   * Resuelve la configuración activa del tenant mediante el token.
   *
   * @returns `null` si el token es inválido, el canal no existe,
   *          está INACTIVE, no es WEB_CHAT o el tenant no está ACTIVE.
   */
  async resolveByToken(token: string): Promise<PublicChannelConfigDTO | null> {
    if (!isPublicChannelToken(token)) {
      return null;
    }

    const channel = await Channel.findOne({
      publicToken: token,
      status: "ACTIVE",
      type: "WEB_CHAT",
    })
      .select("tenantId name publicToken config")
      .lean();

    if (!channel) {
      return null;
    }

    const tenant = await Tenant.findById(channel.tenantId)
      .select(["name", "status", "logoUrl", "brandColor"])
      .lean();

    if (!tenant || tenant.status !== "ACTIVE") {
      return null;
    }

    const widget = (channel.config?.widget ?? {}) as {
      title?: string;
      greetingMessage?: string;
      primaryColor?: string;
      position?: "bottom-right" | "bottom-left";
    };

    return this.toConfigDTO({
      channel: {
        id: String(channel._id),
        name: channel.name,
        publicToken: channel.publicToken ?? token,
        widget: {
          title: widget.title,
          greetingMessage: widget.greetingMessage,
          primaryColor: widget.primaryColor,
          position: widget.position ?? "bottom-right",
        },
      },
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
        status: "ACTIVE",
      },
    });
  }

  /** Resuelve el par canal/tenant completo (para SSR y metadatos). */
  async resolveFullByToken(token: string): Promise<ChannelResolution | null> {
    if (!isPublicChannelToken(token)) {
      return null;
    }

    const channel = await Channel.findOne({
      publicToken: token,
      status: "ACTIVE",
      type: "WEB_CHAT",
    })
      .select("tenantId name publicToken config")
      .populate<{
        tenantId: {
          _id: Types.ObjectId;
          name: string;
          logoUrl?: string;
          brandColor?: string;
          status: string;
        };
      }>({ path: "tenantId", select: "name logoUrl brandColor status" })
      .lean();

    if (!channel) {
      return null;
    }

    const tenant = channel.tenantId as unknown as {
      _id: { toString(): string };
      name: string;
      logoUrl?: string;
      brandColor?: string;
      status: string;
    };

    if (!tenant || tenant.status !== "ACTIVE") {
      return null;
    }

    const widget = (channel.config?.widget ?? {}) as NonNullable<
      ChannelResolution["channel"]
    >["widget"];

    return {
      channel: {
        id: String(channel._id),
        name: channel.name,
        publicToken: channel.publicToken ?? token,
        widget: {
          title: widget.title,
          greetingMessage: widget.greetingMessage,
          primaryColor: widget.primaryColor,
          position: widget.position ?? "bottom-right",
        },
      },
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
        status: "ACTIVE",
      },
    };
  }

  /** DTO público JSON a partir del par canal/tenant resuelto. */
  toConfigDTO(resolution: ChannelResolution): PublicChannelConfigDTO {
    const widget = resolution.channel.widget;

    return {
      token: resolution.channel.publicToken,
      tenantId: resolution.tenant.id,
      tenantName: resolution.tenant.name,
      logoUrl: resolution.tenant.logoUrl,
      // Fallbacks defensivos: widget → tenant
      primaryColor: widget.primaryColor ?? resolution.tenant.brandColor,
      welcomeMessage:
        widget.greetingMessage ??
        `Hola 👋 ¿En qué podemos ayudarte hoy?`,
      position: widget.position,
    };
  }

  /** URL standalone directa para redes sociales / bio. */
  getStandaloneUrl(token: string): string {
    return `${this.appBaseUrl.replace(/\/$/, "")}/c/${token}`;
  }

  /** Snippet HTML `<script>` para embeber en sitios web de terceros. */
  getEmbedScript(token: string): string {
    const cdn = this.cdnBaseUrl.replace(/\/$/, "");
    return `<script src="${cdn}/v1/widget.js" data-quopilot-token="${token}" async></script>`;
  }

  /** Convierte una resolución completa en metadatos OpenGraph. */
  buildOpenGraphMetadata(
    resolution: ChannelResolution,
  ): OpenGraphMetadataDTO {
    const config = this.toConfigDTO(resolution);

    return {
      title: `${resolution.tenant.name} — Chat en línea`,
      description:
        config.welcomeMessage ||
        `Escríbenos por WhatsApp o chat web. Te responderemos al instante.`,
      image: config.logoUrl,
      url: this.getStandaloneUrl(config.token),
      type: "website",
    };
  }
}

export const publicChannelService = new PublicChannelService();
