// src/services/revalidation.ts (quopilot-api)

const LANDING_URL = process.env.LANDING_REVALIDATE_URL ?? "";
const LANDING_SECRET = process.env.LANDING_REVALIDATE_SECRET ?? "";

/**
 * Notifica a la landing (`quopilot-landing`) para regenerar la página al
 * instante tras un cambio en los planes (on-demand ISR). No hace nada si no
 * está configurado (ideal en local).
 */
export async function notifyLandingRevalidation(path = "/"): Promise<void> {
  if (!LANDING_URL || !LANDING_SECRET) return;

  try {
    const response = await fetch(`${LANDING_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: LANDING_SECRET, path }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      console.error(`[revalidation] Landing respondió ${response.status}`);
    }
  } catch (error) {
    console.error("[revalidation] No se pudo notificar a la landing:", error);
  }
}
