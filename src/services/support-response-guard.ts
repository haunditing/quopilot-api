export interface ResponseGuardInput {
  rawReply: string;
  intent: string;
  module: string;
  hasCaseContext: boolean;
  hasDocContext: boolean;
  hasToolData: boolean;
  inScope: boolean;
}

export interface GuardedReply {
  content: string;
  grounded: boolean;
  reason?: string;
}

const UNGROUNDED_MARKERS =
  /no estoy seguro|creo que|probablemente|quiz[aá]s|puede que|tal vez|seg[uú]n mi conocimiento general|no tengo informaci[oó]n|no tengo datos/i;

const PROCEDURE_INVENTION_MARKERS =
  /puedes (crear|modificar|eliminar|configurar).*por ti mismo|voy a (cambiar|configurar|modificar|eliminar)|he (modificado|cambiado|creado|configurado)|acabo de (actualizar|activar|desactivar)/i;

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function guardResponse(input: ResponseGuardInput): GuardedReply {
  const {
    rawReply,
    intent,
    inScope,
    hasCaseContext,
    hasDocContext,
    hasToolData,
  } = input;

  if (!inScope) {
    return {
      content:
        "Solo puedo ayudarte con consultas relacionadas con la aplicación QuoPilot (cotizaciones, ventas, productos, clientes, usuarios, canales, configuración, PDF, etc.). Si tienes un problema o duda sobre el sistema, cuéntame el detalle y te ayudo.",
      grounded: false,
      reason: "out_of_scope",
    };
  }

  if (isEmpty(rawReply)) {
    return {
      content:
        "No pude generar una respuesta clara para tu consulta. Intenta reformularla con más detalle o consulta la documentación de QuoPilot.",
      grounded: false,
      reason: "empty_reply",
    };
  }

  if (PROCEDURE_INVENTION_MARKERS.test(rawReply)) {
    return {
      content:
        "No puedo realizar cambios ni acciones sobre la plataforma por mi cuenta. Puedo orientarte sobre cómo hacerlo en la aplicación, indicarte el estado real del sistema o consultar documentación. Cuéntame qué necesitas y te guío paso a paso.",
      grounded: false,
      reason: "procedure_invention",
    };
  }

  if (
    intent !== "greeting" &&
    !hasCaseContext &&
    !hasDocContext &&
    !hasToolData &&
    UNGROUNDED_MARKERS.test(rawReply)
  ) {
    return {
      content:
        "No tengo información suficiente respaldada para responder con precisión tu consulta. Sugiero revisar la documentación de QuoPilot o contactar al equipo de desarrollo para obtener soporte.",
      grounded: false,
      reason: "ungrounded_claim",
    };
  }

  return {
    content: rawReply,
    grounded: true,
  };
}