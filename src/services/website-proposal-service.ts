import { z } from "zod";
import {
  updateTenantSchema,
  type UpdateTenantInput,
} from "../schemas/tenant-schema.js";
import {
  updateAgentSchema,
  type UpdateAgentInput,
} from "../schemas/agent-schema.js";
import {
  createProductSchema,
  type CreateProductInput,
} from "../schemas/product-schema.js";
import { updateTenant } from "./tenant-service.js";
import { updateAgent } from "./agent-service.js";
import { createProduct } from "./product-service.js";
import {
  updateCommercialPolicy,
  type UpdateCommercialPolicyInput,
} from "./commercial-policy-service.js";

export const websiteProposalSchema = z.object({
  url: z.string().trim().min(1),
  tenant: updateTenantSchema.optional(),
  agent: updateAgentSchema.optional(),
  products: z.array(createProductSchema).max(50).optional(),
  commercialPolicy: z
    .object({
      paymentTerms: z.string().trim().optional(),
      discountPolicy: z.string().trim().optional(),
      shippingPolicy: z.string().trim().optional(),
      warrantyPolicy: z.string().trim().optional(),
      returnPolicy: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .optional(),
});

export type WebsiteProposal = z.infer<typeof websiteProposalSchema>;

export interface WebsiteProposalSummary {
  tenant: boolean;
  agent: boolean;
  products: number;
  commercialPolicy: boolean;
  errors: string[];
}

const pendingByTenant = new Map<string, WebsiteProposal>();

export function getPendingProposal(tenantId: string): WebsiteProposal | null {
  return pendingByTenant.get(tenantId) ?? null;
}

export function hasPendingProposal(tenantId: string): boolean {
  return pendingByTenant.has(tenantId);
}

export function clearPendingProposal(tenantId: string): void {
  pendingByTenant.delete(tenantId);
}

export function stageProposal(
  tenantId: string,
  input: WebsiteProposal,
): WebsiteProposal {
  const clean: WebsiteProposal = { ...input };

  if (clean.agent) {
    const agent = { ...clean.agent };

    delete agent.llm;

    clean.agent = agent;
  }

  pendingByTenant.set(tenantId, clean);

  return clean;
}

export async function applyProposal(
  tenantId: string,
): Promise<WebsiteProposalSummary> {
  const proposal = pendingByTenant.get(tenantId);

  if (!proposal) {
    throw new Error(
      "No hay una propuesta pendiente. Primero analiza una página web y guarda una propuesta.",
    );
  }

  const summary: WebsiteProposalSummary = {
    tenant: false,
    agent: false,
    products: 0,
    commercialPolicy: false,
    errors: [],
  };

  if (proposal.tenant && Object.keys(proposal.tenant).length > 0) {
    try {
      await updateTenant(tenantId, proposal.tenant as UpdateTenantInput);

      summary.tenant = true;
    } catch (error) {
      summary.errors.push(
        `Tenant: ${error instanceof Error ? error.message : "error"}`,
      );
    }
  }

  if (proposal.agent && Object.keys(proposal.agent).length > 0) {
    try {
      await updateAgent(tenantId, proposal.agent as UpdateAgentInput);

      summary.agent = true;
    } catch (error) {
      summary.errors.push(
        `Agent: ${error instanceof Error ? error.message : "error"}`,
      );
    }
  }

  for (const product of proposal.products ?? []) {
    try {
      await createProduct(product as CreateProductInput, tenantId);

      summary.products += 1;
    } catch (error) {
      summary.errors.push(
        `Producto "${(product as CreateProductInput).name}": ${error instanceof Error ? error.message : "error"}`,
      );
    }
  }

  if (
    proposal.commercialPolicy &&
    Object.keys(proposal.commercialPolicy).length > 0
  ) {
    try {
      await updateCommercialPolicy(
        tenantId,
        proposal.commercialPolicy as UpdateCommercialPolicyInput,
      );

      summary.commercialPolicy = true;
    } catch (error) {
      summary.errors.push(
        `CommercialPolicy: ${error instanceof Error ? error.message : "error"}`,
      );
    }
  }

  pendingByTenant.delete(tenantId);

  return summary;
}

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

export function formatProposal(proposal: WebsiteProposal): string {
  const lines: string[] = ["Analicé tu página web y preparé esta propuesta:"];

  if (proposal.tenant) {
    const t = proposal.tenant;
    const parts: string[] = [];

    if (t.name) parts.push(`nombre: "${t.name}"`);
    if (t.website) parts.push(`web: "${t.website}"`);
    if (t.email) parts.push(`email: "${t.email}"`);
    if (t.phone) parts.push(`teléfono: "${t.phone}"`);
    if (t.address) parts.push(`dirección: "${t.address}"`);
    if (t.city) parts.push(`ciudad: "${t.city}"`);
    if (t.country) parts.push(`país: "${t.country}"`);

    if (parts.length) lines.push(`- Empresa (Tenant): ${parts.join(", ")}`);
  }

  if (proposal.agent) {
    const a = proposal.agent;
    const parts: string[] = [];

    if (a.name) parts.push(`nombre: "${a.name}"`);
    if (a.description) parts.push(`descripción: "${a.description}"`);
    if (a.commercialObjective)
      parts.push(`objetivo: "${a.commercialObjective}"`);
    if (a.welcomeMessage) parts.push(`bienvenida: "${a.welcomeMessage}"`);
    if (a.tone) parts.push(`tono: ${TONE_LABELS[a.tone] ?? a.tone}`);
    if (a.language)
      parts.push(`idioma: ${LANGUAGE_LABELS[a.language] ?? a.language}`);
    if (a.behaviorRules?.length)
      parts.push(`reglas: ${a.behaviorRules.length} regla(s)`);

    if (parts.length) lines.push(`- Agente de IA: ${parts.join(", ")}`);
  }

  const products = proposal.products ?? [];

  if (products.length) {
    const names = products
      .map((p) => {
        const price =
          typeof p.basePrice === "number"
            ? ` ($${p.basePrice} ${p.currency ?? ""})`
            : "";
        return `${p.name}${price}`;
      })
      .join(", ");

    lines.push(`- Productos propuestos (${products.length}): ${names}`);
  }

  if (proposal.commercialPolicy) {
    const p = proposal.commercialPolicy;
    const parts: string[] = [];

    if (p.paymentTerms) parts.push(`pagos: "${p.paymentTerms}"`);
    if (p.shippingPolicy) parts.push(`envíos: "${p.shippingPolicy}"`);
    if (p.warrantyPolicy) parts.push(`garantía: "${p.warrantyPolicy}"`);
    if (p.returnPolicy) parts.push(`devoluciones: "${p.returnPolicy}"`);
    if (p.discountPolicy) parts.push(`descuentos: "${p.discountPolicy}"`);
    if (p.notes) parts.push(`notas: "${p.notes}"`);

    if (parts.length)
      lines.push(`- Política comercial: ${parts.join(", ")}`);
  }

  return lines.join("\n");
}

function firstSentence(text: string, minLength = 25): string | undefined {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= minLength);

  return sentences[0];
}

function firstEmail(text: string): string | undefined {
  const match = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text);

  return match?.[0];
}

function firstPhone(text: string): string | undefined {
  const match =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{2,4}/.exec(
      text,
    );

  return match?.[0];
}

function policySection(
  text: string,
  pattern: RegExp,
  window = 160,
): string | undefined {
  const index = text.search(pattern);

  if (index < 0) {
    return undefined;
  }

  const start = Math.max(0, index - 60);

  return text.slice(start, index + window).replace(/\s+/g, " ").trim();
}

export function buildProposalFromText(input: {
  url: string;
  title?: string;
  text: string;
}): WebsiteProposal {
  const text = input.text.trim();

  const proposal: WebsiteProposal = {
    url: input.url,
  };

  const title = input.title?.trim();

  if (title) {
    proposal.tenant = {
      website: input.url,
    };

    proposal.agent = {
      name: title,
    };
  }

  const description = firstSentence(text);

  if (description) {
    proposal.agent = {
      ...(proposal.agent ?? {}),
      description,
    };
  }

  const email = firstEmail(text);

  if (email) {
    proposal.tenant = {
      ...(proposal.tenant ?? {}),
      email,
    };
  }

  const phone = firstPhone(text);

  if (phone) {
    proposal.tenant = {
      ...(proposal.tenant ?? {}),
      phone,
    };
  }

  const addressMatch =
    /(?:direcci[oó]n|address|calle|carrera|cra\.?|av\.?|avenida)[^.!?]{3,80}/i.exec(
      text,
    );

  if (addressMatch) {
    proposal.tenant = {
      ...(proposal.tenant ?? {}),
      address: addressMatch[0].replace(/\s+/g, " ").trim(),
    };
  }

  const paymentTerms = policySection(text, /pago|payment|t[eé]rminos de pago/i);

  if (paymentTerms) {
    proposal.commercialPolicy = {
      ...(proposal.commercialPolicy ?? {}),
      paymentTerms,
    };
  }

  const shippingPolicy = policySection(
    text,
    /env[ií]o|shipping|entrega|delivery/i,
  );

  if (shippingPolicy) {
    proposal.commercialPolicy = {
      ...(proposal.commercialPolicy ?? {}),
      shippingPolicy,
    };
  }

  const warrantyPolicy = policySection(text, /garant[ií]a|warranty/i);

  if (warrantyPolicy) {
    proposal.commercialPolicy = {
      ...(proposal.commercialPolicy ?? {}),
      warrantyPolicy,
    };
  }

  const returnPolicy = policySection(
    text,
    /devoluci[oó]n|return|reembolso/i,
  );

  if (returnPolicy) {
    proposal.commercialPolicy = {
      ...(proposal.commercialPolicy ?? {}),
      returnPolicy,
    };
  }

  const productMatches = [
    ...text.matchAll(
      /([A-ZÁÉÍÓÚÑa-záéíóúñ][\w\sáéíóúñÁÉÍÓÚÑ-]{2,50}?)\s*[:•\-]?\s*\$?\s?(\d{2,}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(COP|USD|EUR|MXN|US\$)?/g,
    ),
  ].slice(0, 10);

  const products: CreateProductInput[] = [];

  for (const match of productMatches) {
    const name = match[1].trim().replace(/\s+/g, " ");

    if (name.length < 3) {
      continue;
    }

    products.push({
      itemType: "PRODUCT",
      name,
      basePrice: 0,
      taxRate: 0,
      currency: "COP",
    });
  }

  if (products.length) {
    proposal.products = products;
  }

  return proposal;
}