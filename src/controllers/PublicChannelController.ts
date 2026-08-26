import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { publicChannelService } from "../services/PublicChannelService.js";
import { isPublicChannelToken } from "../dto/public-channel.dto.js";


const WEBCHAT_SSR_DIST_DIR =
  process.env.PUBLIC_WEB_DIST_DIR ??
  path.resolve(process.cwd(), "..", "quopilot-web", "dist");

/** Escapa `</` para evitar breakout del contexto <script>. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Inyecta metadatos OG y estado de hidratación en el HTML del frontend. */
function injectIntoTemplate(
  template: string,
  ogTags: string,
  hydrationScript: string,
): string {
  if (template.includes("</head>")) {
    return template.replace(
      "</head>",
      `${ogTags}\n${hydrationScript}\n</head>`,
    );
  }

  // Plantilla sin </head>: añadir al inicio del documento.
  const headOpen = template.indexOf("<head>");
  if (headOpen !== -1) {
    const insertAt = headOpen + "<head>".length;
    return `${template.slice(0, insertAt)}\n${ogTags}\n${hydrationScript}${template.slice(insertAt)}`;
  }

  return `${ogTags}\n${hydrationScript}\n${template}`;
}

/** Página mínima cuando no hay build de frontend disponible. */
function fallbackHtml(ogTags: string, redirectTarget: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
${ogTags}
<script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
</head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh">
<p>Iniciando chat…</p>
</body>
</html>`;
}

/**
 * GET /api/v1/public/channels/:token
 * Configuración pública JSON del canal WebChat.
 */
export async function getPublicChannelConfigController(
  req: Request,
  res: Response,
): Promise<void> {
  const token = String(req.params.token ?? "");

  if (!isPublicChannelToken(token)) {
    res.status(400).json({ message: "Invalid channel token" });
    return;
  }

  try {
    const config = await publicChannelService.resolveByToken(token);

    if (!config) {
      res.status(404).json({ message: "Channel not found" });
      return;
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("[PublicChannel] Error resolving config:", error);
    res.status(500).json({ message: "Unable to load channel config" });
  }
}

/**
 * GET /c/:token
 * Página SSR con metadatos OpenGraph para rastreadores
 * e hidratación del frontend con el estado del tenant.
 */
export async function getPublicChannelPageController(
  req: Request,
  res: Response,
): Promise<void> {
  const token = String(req.params.token ?? "");

  if (!isPublicChannelToken(token)) {
    res.status(400).type("text").send("Invalid channel token");
    return;
  }

  try {
    const resolution =
      await publicChannelService.resolveFullByToken(token);

    if (!resolution) {
      res.status(404).type("text").send("Chat no disponible");
      return;
    }



    const og = publicChannelService.buildOpenGraphMetadata(resolution);

    const ogTags = [
      `<meta property="og:title" content="${og.title.replace(/"/g, "&quot;")}" />`,
      `<meta property="og:description" content="${og.description.replace(/"/g, "&quot;")}" />`,
      og.image
        ? `<meta property="og:image" content="${og.image.replace(/"/g, "&quot;")}" />`
        : "",
      `<meta property="og:url" content="${og.url}" />`,
      `<meta property="og:type" content="${og.type}" />`,
      `<meta name="twitter:card" content="summary" />`,
      `<meta name="twitter:title" content="${og.title.replace(/"/g, "&quot;")}" />`,
      `<meta name="twitter:description" content="${og.description.replace(/"/g, "&quot;")}" />`,
      og.image
        ? `<meta name="twitter:image" content="${og.image.replace(/"/g, "&quot;")}" />`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const spaRoute = `/public/chat/${resolution.tenant.id}`;
    const hydrationState = {
      channel: resolution.channel.publicToken,
      tenantId: resolution.tenant.id,
      tenantName: resolution.tenant.name,
      logoUrl: resolution.tenant.logoUrl,
      primaryColor:
        resolution.channel.widget.primaryColor ??
        resolution.tenant.brandColor,
      welcomeMessage:
        resolution.channel.widget.greetingMessage ?? "",
      standaloneUrl: publicChannelService.getStandaloneUrl(token),
      embedScript: publicChannelService.getEmbedScript(token),
    };

    const embedScript = publicChannelService.getEmbedScript(token);
    const standaloneUrl = publicChannelService.getStandaloneUrl(token);
    const hydrationScript = `<script>
window.__QUOPILOT_PUBLIC_CHANNEL__ = ${safeJson(hydrationState)};
try { history.replaceState({}, "", ${JSON.stringify(spaRoute)}); } catch (_) {}
</script>`;

    const templatePath = path.join(WEBCHAT_SSR_DIST_DIR, "index.html");
    const template = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, "utf-8")
      : null;

    if (template) {
      const html = injectIntoTemplate(template, ogTags, hydrationScript);
      res.status(200).contentType("text/html").send(html);
      return;
    }

    // Sin build de frontend: shell mínimo con redirección al SPA.
    res
      .status(200)
      .contentType("text/html")
      .send(fallbackHtml(ogTags, spaRoute));
  } catch (error) {
    console.error("[PublicChannel] Error rendering page:", error);
    res.status(500).type("text").send("Internal error");
  }
}

/**
 * GET /api/v1/public/channels/by-tenant/:tenantId
 * Resuelve el token público del canal WEB_CHAT activo por tenant.
 * Público (para que la landing use el mismo widget que los tenants).
 */
export async function getPublicTokenByTenantController(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");

  if (!Types.ObjectId.isValid(tenantId)) {
    res.status(400).json({ message: "Invalid tenantId" });
    return;
  }

  try {
    const token = await publicChannelService.getPublicTokenByTenant(tenantId);

    if (!token) {
      res.status(404).json({ message: "No web chat channel configured" });
      return;
    }

    res.status(200).json({ token });
  } catch (error) {
    console.error("[PublicChannel] Error resolving token by tenant:", error);
    res.status(500).json({ message: "Unable to load channel token" });
  }
}
