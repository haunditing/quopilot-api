import type {
  AgentContextProfile,
  CommercialPolicyProfile,
  ConversationContextProfile,
  CustomerContextProfile,
  CustomerHistoryProfile,
  ProductContextItem,
  QuoteContextItem,
  SaleContextItem,
  TenantContextProfile,
} from "./types.js";

const TONE_LABELS: Record<string, string> = {
  PROFESSIONAL: "Profesional",
  FRIENDLY: "Amigable",
  FORMAL: "Formal",
  CASUAL: "Casual",
  EMPATHETIC: "Empático",
};

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
};

export function serializeAgent(agent: AgentContextProfile): string {
  const lines: string[] = ["# CONFIGURACIÓN DEL AGENTE"];

  if (agent.name) {
    lines.push(`- Nombre: ${agent.name}`);
  }

  if (agent.description) {
    lines.push(`- Descripción: ${agent.description}`);
  }

  if (agent.personality) {
    lines.push(`- Personalidad: ${agent.personality}`);
  }

  if (agent.tone && TONE_LABELS[agent.tone]) {
    lines.push(`- Tono: ${TONE_LABELS[agent.tone]}`);
  }

  if (agent.language) {
    lines.push(
      `- Idioma de respuesta: ${LANGUAGE_LABELS[agent.language] ?? agent.language}`,
    );
  }

  if (agent.status) {
    lines.push(
      `- Estado: ${agent.status === "ACTIVE" ? "Activo" : "Inactivo"}`,
    );
  }

  if (agent.commercialObjective) {
    lines.push(`- Objetivo comercial: ${agent.commercialObjective}`);
  }

  if (agent.productScope) {
    const scope =
      agent.productScope === "SELECTED"
        ? `Solo productos seleccionados (${agent.allowedProductIds?.length ?? 0} en lista permitida)`
        : "Todos los productos activos del catálogo";
    lines.push(`- Catálogo: ${scope}`);
  }

  if (agent.enabledTools?.length) {
    lines.push(`- Herramientas habilitadas: ${agent.enabledTools.join(", ")}`);
  } else {
    lines.push("- Herramientas habilitadas: todas");
  }

  if (agent.systemInstructions) {
    lines.push(`- Instrucciones del sistema: ${agent.systemInstructions}`);
  }

  if (agent.behaviorRules?.length) {
    lines.push(
      `- Reglas de comportamiento:\n${agent.behaviorRules
        .map((rule) => `   - ${rule}`)
        .join("\n")}`,
    );
  }

  return lines.join("\n");
}

export function serializeTenant(tenant: TenantContextProfile): string {
  const lines: string[] = ["# EMPRESA"];

  lines.push(`- Nombre: ${tenant.name ?? "—"}`);

  if (tenant.legalName) {
    lines.push(`- Razón social: ${tenant.legalName}`);
  }

  if (tenant.currency) {
    lines.push(`- Moneda: ${tenant.currency}`);
  }

  if (tenant.country) {
    lines.push(`- País: ${tenant.country}`);
  }

  return lines.join("\n");
}

export function serializeCustomer(customer: CustomerContextProfile): string {
  const lines: string[] = ["# CLIENTE ACTUAL"];

  lines.push(`- Nombre: ${customer.name ?? "Cliente"}`);

  if (customer.email) {
    lines.push(`- Email: ${customer.email}`);
  }

  if (customer.phone) {
    lines.push(`- Teléfono: ${customer.phone}`);
  }

  if (customer.country) {
    lines.push(`- País: ${customer.country}`);
  }

  return lines.join("\n");
}

export function serializeConversation(
  conversation: ConversationContextProfile,
): string {
  const channelLabels: Record<string, string> = {
    WEB_CHAT: "Web",
    WHATSAPP: "WhatsApp",
  };

  return [
    "# CONVERSACIÓN",
    `- Canal: ${channelLabels[conversation.channel ?? ""] ?? conversation.channel ?? "—"}`,
    `- Estado: ${conversation.status === "OPEN" ? "Abierta" : "Cerrada"}`,
  ].join("\n");
}

function formatPolicy(policy: CommercialPolicyProfile): string | null {
  const sections = [
    { label: "Condiciones de pago", value: policy.paymentTerms },
    { label: "Política de descuentos", value: policy.discountPolicy },
    { label: "Política de envíos", value: policy.shippingPolicy },
    { label: "Garantías", value: policy.warrantyPolicy },
    { label: "Devoluciones", value: policy.returnPolicy },
    { label: "Notas adicionales", value: policy.notes },
  ].filter((section) => section.value?.trim());

  if (!sections.length) {
    return null;
  }

  return sections
    .map((section) => `- ${section.label}: ${section.value}`)
    .join("\n");
}

export function serializePolicy(policy: CommercialPolicyProfile): string {
  const body = formatPolicy(policy);

  if (!body) {
    return "";
  }

  return `# POLÍTICAS COMERCIALES\n${body}`;
}

export function serializeSummary(summary: string): string {
  return `# RESUMEN DE LA CONVERSACIÓN\n${summary}`;
}

export function serializeCustomerHistory(
  history: CustomerHistoryProfile,
): string {
  const lines: string[] = ["# HISTORIAL DEL CLIENTE"];

  lines.push(`- Compras confirmadas: ${history.totalSales}`);

  if (history.totalSales > 0) {
    lines.push(`- Total invertido: $${history.totalSpent}`);

    if (history.lastPurchaseAt) {
      lines.push(
        `- Última compra: ${new Date(history.lastPurchaseAt).toISOString().slice(0, 10)}`,
      );
    }
  }

  lines.push(`- Cotizaciones abiertas: ${history.openQuotes}`);

  return lines.join("\n");
}

export function serializeProducts(products: ProductContextItem[]): string {
  if (!products.length) {
    return "";
  }

  const lines = products.map((product) => {
    const price = `$${product.unitPrice} ${product.currency}`;

    return `- ${product.name}${product.sku ? ` (${product.sku})` : ""}: ${price}`;
  });

  return `# PRODUCTOS RELEVANTES\n${lines.join("\n")}`;
}

export function serializeQuotes(quotes: QuoteContextItem[]): string {
  if (!quotes.length) {
    return "";
  }

  const lines = quotes.map((quote) => {
    const date = quote.createdAt.slice(0, 10);
    const items = quote.items
      .slice(0, 3)
      .map((item) => `${item.name} x${item.quantity}`)
      .join(", ");

    return `- #${quote.number} [${quote.status}] ${date} · $${quote.total} ${quote.currency}${items ? ` · ${items}` : ""}`;
  });

  return `# COTIZACIONES RELEVANTES\n${lines.join("\n")}`;
}

export function serializeSales(sales: SaleContextItem[]): string {
  if (!sales.length) {
    return "";
  }

  const lines = sales.map(
    (sale) =>
      `- #${sale.number} ${sale.soldAt.slice(0, 10)} · $${sale.total} ${sale.currency}`,
  );

  return `# VENTAS RELEVANTES\n${lines.join("\n")}`;
}
