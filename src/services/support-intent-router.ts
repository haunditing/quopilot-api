export type SupportModule =
  | "quotes"
  | "sales"
  | "products"
  | "customers"
  | "users"
  | "tenants"
  | "channels"
  | "conversations"
  | "agent"
  | "settings"
  | "auth"
  | "pdf"
  | "dashboard"
  | "api"
  | "platform"
  | "unknown";

export type SupportIntent =
  | "troubleshoot"
  | "howto"
  | "query"
  | "config"
  | "greeting"
  | "unknown";

export interface ScopeResult {
  inScope: boolean;
  reason?: string;
}

export interface IntentResult {
  module: SupportModule;
  intent: SupportIntent;
}

const GREETING_PATTERN =
  /\b(hola|buenas|buen d[ií]a|buenas tardes|buenas noches|hey|qui[eé]n eres|que eres|qu[eé] eres|sos bot|eres un bot|saludos)\b/i;

const OUT_OF_SCOPE_PATTERN =
  /\b(pol[ií]tica|religi[oó]n|deporte|receta|recetas de cocina|poema|chiste|clima de|pron[oó]stico del tiempo|noticias de|precio del petr[oó]leo|elecciones|f[ií]sica cu[aá]ntica|c[oó]digo de otro)\b/i;

const MODULE_PATTERNS: Array<{
  module: SupportModule;
  label: string;
  pattern: RegExp;
}> = [
  {
    module: "quotes",
    label: "cotizaciones",
    pattern:
      /\b(cotiza|cotizaci[oó]n|cotizaciones|presupuesto|quote|presupuestos)\b/i,
  },
  {
    module: "sales",
    label: "ventas",
    pattern: /\b(venta|ventas|sale|sales|vender|vendido|vendida)\b/i,
  },
  {
    module: "products",
    label: "productos",
    pattern:
      /\b(producto|productos|cat[aá]logo|sku|stock|inventario|precio de venta|item|art[ií]culo)\b/i,
  },
  {
    module: "customers",
    label: "clientes",
    pattern: /\b(cliente|clientes|customer|customers|contacto|prospecto)\b/i,
  },
  {
    module: "users",
    label: "usuarios",
    pattern:
      /\b(usuario|usuarios|user|users|agente de ventas|empleado|rol|permiso|acceso de usuario)\b/i,
  },
  {
    module: "tenants",
    label: "tenants/empresas",
    pattern:
      /\b(tenant|tenants|empresa|empresas|negocio|negocios|organizaci[oó]n|compa[nñ][ií]a|inquilino)\b/i,
  },
  {
    module: "channels",
    label: "canales",
    pattern:
      /\b(canal|canales|channel|channels|whatsapp|web chat|webchat|instagram|integraci[oó]n de canal)\b/i,
  },
  {
    module: "conversations",
    label: "conversaciones",
    pattern:
      /\b(conversaci[oó]n|conversaciones|conversation|inbox|buz[oó]n|chat con cliente|bandeja)\b/i,
  },
  {
    module: "agent",
    label: "agente de IA",
    pattern:
      /\b(agente de ia|agente comercial|agente de ventas|asistente comercial|prompt del agente|configuraci[oó]n del agente|agente ai|agente)\b/i,
  },
  {
    module: "settings",
    label: "configuración",
    pattern:
      /\b(configuraci[oó]n|configurar|ajustes|settings|pol[ií]tica comercial|logo|marca|moneda|zona horaria|facturaci[oó]n|direcci[oó]n de la empresa)\b/i,
  },
  {
    module: "auth",
    label: "autenticación",
    pattern:
      /\b(iniciar sesi[oó]n|login|logout|contrase[nñ]a|password|token|jwt|autenticaci[oó]n|bloqueo de cuenta|credenciales)\b/i,
  },
  {
    module: "pdf",
    label: "PDF/impresión",
    pattern:
      /\b(pdf|imprimir|impresi[oó]n|documento pdf|cotizaci[oó]n pdf|descargar pdf|plantilla de impresi[oó]n)\b/i,
  },
  {
    module: "dashboard",
    label: "dashboard",
    pattern:
      /\b(dashboard|tablero|panel de control|indicadores|kpi|m[eé]tricas|estad[ií]sticas|resumen del negocio)\b/i,
  },
  {
    module: "api",
    label: "API/integraciones",
    pattern:
      /\b(api|webhook|webhooks|endpoint|integraci[oó]n|api key|token de api|conectar con)\b/i,
  },
  {
    module: "platform",
    label: "plataforma",
    pattern:
      /\b(plataforma|sistema|aplicaci[oó]n|app|quopilot|servidor|base de datos|mongodb|error del sistema|funciona el sistema)\b/i,
  },
];

const TROUBLESHOOT_PATTERN =
  /\b(error|errors|no funciona|no carga|no env[ií]a|no recibe|falla|fall[oó]|bug|roto|no me deja|no puedo|no puedo ver|no se muestra|problema|problemas|rompi[oó]|marc[oó] error|f[oó]rmula de error|excepci[oó]n|timeout|no llega|no se guarda|no se elimin[oó]|bloqueado|no abre)\b/i;

const HOWTO_PATTERN =
  /\b(c[oó]mo|c[oó]mo hago|qu[eé] pasos|puedes explicar|explica|c[oó]mo se|procedimiento|gu[ií]a|paso a paso|tutorial|manual|crear un|crear una|registrar|agregar un|agregar una|eliminar un|eliminar una|modificar|cambiar un|cambiar una)\b/i;

const QUERY_PATTERN =
  /\b(cu[aá]nto|cua[aá]ntas|cua[aá]ntos|qu[eé] tengo|list[aá]me|muestra|dime|estado|estad[aá]s|hay alg[oó]n|cual es el estado|qu[eé] es|qu[eé] son|para qu[eé] sirve|c[oó]mo est[aá]|resumen|total de|total)\b/i;

const CONFIG_PATTERN =
  /\b(configura|configuraci[oó]n|cambia|cambiar|actualiza|actualizar|ajusta|ajustar|edita|editar|modifica|modificar|activa|activar|desactiva|desactivar|habilita|deshabilita)\b/i;

export function classifyScope(content: string): ScopeResult {
  const text = content.trim();

  if (!text) {
    return {
      inScope: false,
      reason: "empty",
    };
  }

  if (GREETING_PATTERN.test(text) && text.split(/\s+/).length <= 6) {
    return {
      inScope: true,
      reason: "greeting",
    };
  }

  if (OUT_OF_SCOPE_PATTERN.test(text)) {
    return {
      inScope: false,
      reason: "out_of_scope_topic",
    };
  }

  const matchedModule = MODULE_PATTERNS.find(({ pattern }) =>
    pattern.test(text),
  );

  if (matchedModule) {
    return {
      inScope: true,
      reason: "module",
    };
  }

  if (
    TROUBLESHOOT_PATTERN.test(text) ||
    HOWTO_PATTERN.test(text) ||
    CONFIG_PATTERN.test(text) ||
    QUERY_PATTERN.test(text)
  ) {
    return {
      inScope: true,
      reason: "intent",
    };
  }

  return {
    inScope: false,
    reason: "no_app_context",
  };
}

export function routeIntent(content: string): IntentResult {
  const text = content.trim();

  if (GREETING_PATTERN.test(text) && text.split(/\s+/).length <= 6) {
    return {
      module: "unknown",
      intent: "greeting",
    };
  }

  const matched = MODULE_PATTERNS.find(({ pattern }) => pattern.test(text));

  const module: SupportModule = matched?.module ?? "unknown";

  if (TROUBLESHOOT_PATTERN.test(text)) {
    return { module, intent: "troubleshoot" };
  }

  if (CONFIG_PATTERN.test(text)) {
    return { module, intent: "config" };
  }

  if (HOWTO_PATTERN.test(text)) {
    return { module, intent: "howto" };
  }

  if (QUERY_PATTERN.test(text)) {
    return { module, intent: "query" };
  }

  return { module, intent: "unknown" };
}

export function moduleLabel(module: SupportModule): string {
  return (
    MODULE_PATTERNS.find(({ module: value }) => value === module)?.label ??
    "plataforma"
  );
}