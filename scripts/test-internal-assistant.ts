import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Agent } from "../src/models/Agent.js";
import { Product } from "../src/models/Product.js";
import { Customer } from "../src/models/Customer.js";
import { Quote } from "../src/models/Quote.js";
import { Sale } from "../src/models/Sale.js";
import { Channel } from "../src/models/Channel.js";
import { CommercialPolicy } from "../src/models/CommercialPolicy.js";
import { AssistantConversation } from "../src/models/AssistantConversation.js";
import { AssistantMessage } from "../src/models/AssistantMessage.js";
import { getAssistant } from "../src/services/assistant-engine.js";
import { INTERNAL_TENANT_ASSISTANT_ID } from "../src/services/internal-tenant-assistant.js";
import { provisionAgent, updateAgent } from "../src/services/agent-service.js";
import { createChannel } from "../src/services/channel-service.js";
import { updateCommercialPolicy } from "../src/services/commercial-policy-service.js";

const ORIGINAL_URI = process.env.MONGODB_URI as string;
const TEST_URI = ORIGINAL_URI;

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  [PASS] ${label}`);
  } else {
    failures += 1;
    console.log(`  [FAIL] ${label}${detail ? ` -> ${detail}` : ""}`);
  }
}

async function login(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{ token: string; role: string }> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = (await res.json()) as {
    accessToken?: string;
    user?: { role?: string };
  };

  if (!res.ok || !body.accessToken) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  return { token: body.accessToken, role: body.user?.role ?? "" };
}

interface Seed {
  tenantAId: string;
  tenantBId: string;
  adminA: { email: string; password: string };
  adminB: { email: string; password: string };
  agentUserA: { email: string; password: string };
  productAIds: string[];
  customerAIds: string[];
  quoteAIds: string[];
  saleAIds: string[];
}

async function seed(): Promise<Seed> {
  const suffix = randomUUID().slice(0, 8);

  const tenantA = await Tenant.create({
    name: `Functional Test A ${suffix}`,
    email: `qa-a-${suffix}@test.local`,
    country: "CO",
    currency: "COP",
    timezone: "America/Bogota",
    status: "ACTIVE",
  });

  const tenantB = await Tenant.create({
    name: `Functional Test B ${suffix}`,
    email: `qa-b-${suffix}@test.local`,
    country: "MX",
    currency: "MXN",
    timezone: "America/Mexico_City",
    status: "ACTIVE",
  });

  const adminPassword = `Test${suffix}!a1`;
  const agentPassword = `Agent${suffix}!a1`;
  const superPassword = `Super${suffix}!a1`;

  const passwordHashA = await bcrypt.hash(adminPassword, 12);
  const passwordHashB = await bcrypt.hash(adminPassword, 12);
  const passwordHashAgent = await bcrypt.hash(agentPassword, 12);
  const passwordHashSuper = await bcrypt.hash(superPassword, 12);

  const adminA = await User.create({
    tenantId: tenantA._id,
    name: "QA Admin A",
    email: `qa-admin-a-${suffix}@test.local`,
    passwordHash: passwordHashA,
    role: "TENANT_ADMIN",
    status: "ACTIVE",
  });

  const adminB = await User.create({
    tenantId: tenantB._id,
    name: "QA Admin B",
    email: `qa-admin-b-${suffix}@test.local`,
    passwordHash: passwordHashB,
    role: "TENANT_ADMIN",
    status: "ACTIVE",
  });

  const agentUserA = await User.create({
    tenantId: tenantA._id,
    name: "QA Agent A",
    email: `qa-agent-a-${suffix}@test.local`,
    passwordHash: passwordHashAgent,
    role: "AGENT",
    status: "ACTIVE",
  });

  await User.create({
    name: "QA Super Admin",
    email: `qa-super-${suffix}@test.local`,
    passwordHash: passwordHashSuper,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  });

  const agentA = await provisionAgent(tenantA._id.toString());
  await updateAgent(tenantA._id.toString(), {
    name: "Asistente Comercial A",
    tone: "PROFESSIONAL",
    language: "es",
  });

  const agentB = await provisionAgent(tenantB._id.toString());
  await updateAgent(tenantB._id.toString(), {
    name: "Asistente Comercial B",
    tone: "FRIENDLY",
    language: "en",
  });

  const productA1 = await Product.create({
    tenantId: tenantA._id,
    name: "Producto QA A-1",
    sku: `QA-A1-${suffix}`,
    basePrice: 100,
    taxRate: 0.19,
    unitPrice: 119,
    currency: "COP",
    status: "ACTIVE",
  });

  const productA2 = await Product.create({
    tenantId: tenantA._id,
    name: "Producto QA A-2",
    sku: `QA-A2-${suffix}`,
    basePrice: 200,
    taxRate: 0,
    unitPrice: 200,
    currency: "COP",
    status: "ACTIVE",
  });

  const productB1 = await Product.create({
    tenantId: tenantB._id,
    name: "Producto QA B-1",
    sku: `QA-B1-${suffix}`,
    basePrice: 50,
    taxRate: 0.16,
    unitPrice: 58,
    currency: "MXN",
    status: "ACTIVE",
  });

  const customerA1 = await Customer.create({
    tenantId: tenantA._id,
    name: "Cliente QA A-1",
    email: `qa-c1-${suffix}@test.local`,
    phone: "+573001111111",
    country: "CO",
    isLead: false,
  });

  const customerA2 = await Customer.create({
    tenantId: tenantA._id,
    name: "Cliente QA A-2",
    email: `qa-c2-${suffix}@test.local`,
    phone: "+573002222222",
    country: "CO",
    isLead: false,
  });

  const customerB1 = await Customer.create({
    tenantId: tenantB._id,
    name: "Cliente QA B-1",
    email: `qa-c3-${suffix}@test.local`,
    phone: "+525511111111",
    country: "MX",
    isLead: false,
  });

  const quoteA1 = await Quote.create({
    tenantId: tenantA._id,
    customerId: customerA1._id,
    documentType: "QUOTE",
    number: `COT-QA-${suffix}-001`,
    items: [
      {
        productId: productA1._id,
        name: "Producto QA A-1",
        quantity: 2,
        unitPrice: 100,
        discountPercent: 0,
        taxRate: 0.19,
        subtotal: 200,
        taxAmount: 38,
        totalLine: 238,
      },
    ],
    subtotal: 200,
    totalDiscount: 0,
    totalTax: 38,
    total: 238,
    currency: "COP",
    status: "SENT",
    sentAt: new Date(),
  });

  const quoteA2 = await Quote.create({
    tenantId: tenantA._id,
    customerId: customerA2._id,
    documentType: "QUOTE",
    number: `COT-QA-${suffix}-002`,
    items: [
      {
        productId: productA2._id,
        name: "Producto QA A-2",
        quantity: 1,
        unitPrice: 200,
        discountPercent: 0,
        taxRate: 0,
        subtotal: 200,
        taxAmount: 0,
        totalLine: 200,
      },
    ],
    subtotal: 200,
    totalDiscount: 0,
    totalTax: 0,
    total: 200,
    currency: "COP",
    status: "ACCEPTED",
    acceptedAt: new Date(),
  });

  const quoteB1 = await Quote.create({
    tenantId: tenantB._id,
    customerId: customerB1._id,
    documentType: "QUOTE",
    number: `COT-QB-${suffix}-001`,
    items: [
      {
        productId: productB1._id,
        name: "Producto QA B-1",
        quantity: 1,
        unitPrice: 50,
        discountPercent: 0,
        taxRate: 0.16,
        subtotal: 50,
        taxAmount: 8,
        totalLine: 58,
      },
    ],
    subtotal: 50,
    totalDiscount: 0,
    totalTax: 8,
    total: 58,
    currency: "MXN",
    status: "SENT",
    sentAt: new Date(),
  });

  const saleA1 = await Sale.create({
    tenantId: tenantA._id,
    customerId: customerA1._id,
    quoteId: quoteA1._id,
    number: `VT-QA-${suffix}-001`,
    total: 238,
    currency: "COP",
    status: "CONFIRMED",
    soldAt: new Date(),
  });

  const saleA2 = await Sale.create({
    tenantId: tenantA._id,
    customerId: customerA2._id,
    quoteId: quoteA2._id,
    number: `VT-QA-${suffix}-002`,
    total: 200,
    currency: "COP",
    status: "CONFIRMED",
    soldAt: new Date(),
  });

  const saleB1 = await Sale.create({
    tenantId: tenantB._id,
    customerId: customerB1._id,
    quoteId: quoteB1._id,
    number: `VT-QB-${suffix}-001`,
    total: 58,
    currency: "MXN",
    status: "CONFIRMED",
    soldAt: new Date(),
  });

  await Channel.create({
    tenantId: tenantA._id,
    agentId: agentA._id,
    type: "WHATSAPP",
    name: "WhatsApp QA A",
    status: "ACTIVE",
    config: { phoneNumber: "+573001234567" },
    credentials: {
      accessToken: {
        algorithm: "AES-256-GCM",
        keyVersion: "v1",
        iv: "AAAAAAAAAAAAAAAA",
        tag: "AAAAAAAAAAAAAAAA",
        ciphertext: "cipher-a",
      },
    },
  });

  await Channel.create({
    tenantId: tenantB._id,
    agentId: agentB._id,
    type: "WEB_CHAT",
    name: "Web Chat QA B",
    status: "ACTIVE",
    config: {
      widget: { title: "Chat B", greetingMessage: "Hola", primaryColor: "#fff" },
    },
  });

  await updateCommercialPolicy(tenantA._id.toString(), {
    paymentTerms: "Pago a 30 días",
    discountPolicy: "5% para clientes nuevos",
    shippingPolicy: "Envío gratis sobre 500.000 COP",
    warrantyPolicy: "Garantía de 12 meses",
    returnPolicy: "Devoluciones hasta 15 días",
    notes: "Política funcional test A",
  });

  await updateCommercialPolicy(tenantB._id.toString(), {
    paymentTerms: "Pago de contado",
    notes: "Política funcional test B",
  });

  return {
    tenantAId: tenantA._id.toString(),
    tenantBId: tenantB._id.toString(),
    adminA: { email: adminA.email, password: adminPassword },
    adminB: { email: adminB.email, password: adminPassword },
    agentUserA: { email: agentUserA.email, password: agentPassword },
    productAIds: [productA1._id.toString(), productA2._id.toString()],
    customerAIds: [customerA1._id.toString(), customerA2._id.toString()],
    quoteAIds: [quoteA1._id.toString(), quoteA2._id.toString()],
    saleAIds: [saleA1._id.toString(), saleA2._id.toString()],
  };
}

async function runToolTests(seedData: Seed): Promise<void> {
  const assistant = getAssistant(INTERNAL_TENANT_ASSISTANT_ID);

  if (!assistant) {
    failures += 1;
    console.log("  [FAIL] Assistant not registered");
    return;
  }

  const tools = new Map(assistant.tools.map((tool) => [tool.name, tool]));

  const ctxA = { tenantId: seedData.tenantAId, conversationId: "tool-test" };
  const ctxB = { tenantId: seedData.tenantBId, conversationId: "tool-test" };

  async function callTool(
    name: string,
    ctx: { tenantId: string; conversationId: string },
    args: Record<string, unknown> = {},
  ) {
    const tool = tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool.execute(ctx, args);
  }

  console.log("\n1. getAgentConfig (tenant A)");
  const cfg = await callTool("getAgentConfig", ctxA);
  check("ok=true", cfg.ok, JSON.stringify(cfg).slice(0, 200));
  const agentData = cfg.data as Record<string, unknown>;
  check("name present", typeof agentData.name === "string");
  check(
    "name = 'Asistente Comercial A'",
    agentData.name === "Asistente Comercial A",
  );
  const llmConfig = (agentData.llm ?? {}) as Record<string, unknown>;
  check(
    "no llm.apiKey leaked (no llm or apiKeyConfigured=false)",
    !("apiKey" in llmConfig) && (agentData.llm === undefined || llmConfig.apiKeyConfigured === false),
  );
  check(
    "no tenantId in response",
    !("tenantId" in agentData),
  );
  check(
    "no _id in response",
    !("_id" in agentData),
  );

  console.log("\n2. getProducts (tenant A)");
  const products = await callTool("getProducts", ctxA);
  check("ok=true", products.ok, JSON.stringify(products).slice(0, 200));
  const productItems = (products.data as { items: unknown[] }).items;
  check("total = 2", (products.data as { total: number }).total === 2);
  check("items are compacted (no tenantId)", !JSON.stringify(productItems).includes("tenantId"));
  check(
    "contains QA A products",
    JSON.stringify(productItems).includes("Producto QA A-1") &&
      JSON.stringify(productItems).includes("Producto QA A-2"),
  );

  console.log("\n3. getCustomers (tenant A)");
  const customers = await callTool("getCustomers", ctxA);
  check("ok=true", customers.ok, JSON.stringify(customers).slice(0, 200));
  check("total = 2", (customers.data as { total: number }).total === 2);
  check(
    "contains QA A customers",
    JSON.stringify((customers.data as { items: unknown[] }).items).includes(
      "Cliente QA A-1",
    ),
  );

  console.log("\n4. getCommercialPolicy (tenant A)");
  const policy = await callTool("getCommercialPolicy", ctxA);
  check("ok=true", policy.ok, JSON.stringify(policy).slice(0, 200));
  check(
    "paymentTerms present",
    (policy.data as { paymentTerms?: string })?.paymentTerms === "Pago a 30 días",
  );

  console.log("\n5. getQuotes + getQuoteStatus (tenant A)");
  const quotes = await callTool("getQuotes", ctxA);
  check("ok=true", quotes.ok, JSON.stringify(quotes).slice(0, 200));
  check("total = 2", (quotes.data as { total: number }).total === 2);

  const quoteStatus = await callTool("getQuoteStatus", ctxA, {
    quoteId: seedData.quoteAIds[0],
  });
  check("ok=true", quoteStatus.ok, JSON.stringify(quoteStatus).slice(0, 200));
  check(
    "status = SENT",
    (quoteStatus.data as { status?: string })?.status === "SENT",
  );

  console.log("\n6. getSales (tenant A)");
  const sales = await callTool("getSales", ctxA);
  check("ok=true", sales.ok, JSON.stringify(sales).slice(0, 200));
  check("total = 2", (sales.data as { total: number }).total === 2);
  check(
    "contains QA A sales",
    JSON.stringify((sales.data as { items: unknown[] }).items).includes(
      "VT-QA",
    ),
  );

  console.log("\n7. updateAgentConfig (allowed change)");
  const update = await callTool("updateAgentConfig", ctxA, {
    tone: "FRIENDLY",
    language: "en",
  });
  check("ok=true", update.ok, JSON.stringify(update).slice(0, 300));
  check(
    "new tone applied in result",
    (update.data as { tone?: string })?.tone === "FRIENDLY",
  );

  console.log("\n8. Persistence of update");
  const cfgAfter = await callTool("getAgentConfig", ctxA);
  check(
    "tone persisted (getAgentConfig)",
    (cfgAfter.data as { tone?: string })?.tone === "FRIENDLY",
  );
  const agentFromDb = await Agent.findOne({ tenantId: seedData.tenantAId });
  check(
    "tone persisted (direct DB)",
    agentFromDb?.tone === "FRIENDLY" &&
      agentFromDb?.language === "en",
  );

  console.log("\n9. Isolation between tenants");
  const productsB = await callTool("getProducts", ctxB);
  check(
    "tenant B sees only its own products",
    (productsB.data as { total: number }).total === 1 &&
      JSON.stringify((productsB.data as { items: unknown[] }).items).includes(
        "Producto QA B-1",
      ),
  );
  check(
    "tenant A products NOT visible to B",
    !JSON.stringify(productsB).includes("Producto QA A-1"),
  );

  const customersB = await callTool("getCustomers", ctxB);
  check(
    "tenant B customers are not tenant A's",
    JSON.stringify(customersB).includes("Cliente QA B-1") &&
      !JSON.stringify(customersB).includes("Cliente QA A-1"),
  );

  const quotesB = await callTool("getQuotes", ctxB);
  check(
    "tenant B quotes are its own (COT-QB)",
    JSON.stringify(quotesB).includes("COT-QB-"),
  );
  check(
    "tenant B quotes do NOT include tenant A's",
    !JSON.stringify(quotesB).includes("COT-QA-"),
  );

  const policyB = await callTool("getCommercialPolicy", ctxB);
  check(
    "tenant B policy is its own",
    (policyB.data as { notes?: string })?.notes === "Política funcional test B",
  );

  const cfgB = await callTool("getAgentConfig", ctxB);
  check(
    "tenant B agent is distinct",
    (cfgB.data as { name?: string })?.name === "Asistente Comercial B",
  );

  const salesB = await callTool("getSales", ctxB);
  check(
    "tenant B sales are its own (VT-QB)",
    JSON.stringify(salesB).includes("VT-QB-"),
  );
  check(
    "tenant B sales do NOT include tenant A's",
    !JSON.stringify(salesB).includes("VT-QA-"),
  );

  console.log("\n10. Secret exposure");
  await callTool("updateAgentConfig", ctxB, {
    llm: {
      apiKey: "sk-qa-secret-A1B2C3D4E5F6",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
    },
  });

  const cfgBWithKey = await callTool("getAgentConfig", ctxB);
  const agentJSON = JSON.stringify(cfgBWithKey.data);
  check(
    "apiKey NOT exposed in getAgentConfig",
    !agentJSON.includes("sk-qa-secret-A1B2C3D4E5F6") &&
      (cfgBWithKey.data as { llm?: { apiKeyConfigured?: boolean } })?.llm
        ?.apiKeyConfigured === true,
  );
  check(
    "apiKey NOT exposed in tool result message",
    !JSON.stringify(cfgBWithKey).includes("sk-qa-secret-A1B2C3D4E5F6"),
  );

  await Agent.updateOne(
    { tenantId: seedData.tenantBId },
    { $unset: { "llm.apiKey": 1 } },
  );

  const channelsA = await callTool("getChannels", ctxA);
  check("ok=true", channelsA.ok, JSON.stringify(channelsA).slice(0, 200));
  const channelItems = (channelsA.data as { items: unknown[] }).items;
  check(
    "channel credentials NOT exposed (no ciphertext/credential keys)",
    !JSON.stringify(channelItems).includes("cipher-a") &&
      !JSON.stringify(channelItems).includes("accessToken"),
  );
  check(
    "credentialsConfigured flag present",
    (channelItems[0] as Record<string, unknown>)
      ?.credentialsConfigured === true,
  );

  console.log("\n9b. Business summary (getBusinessSummary)");
  const summary = await callTool("getBusinessSummary", ctxA);
  check("ok=true", summary.ok, JSON.stringify(summary).slice(0, 200));
  const summaryData = summary.data as {
    quotes?: { total?: number; sent?: number; accepted?: number };
    sales?: { total?: number; amount?: number };
    customers?: { total?: number };
    products?: { total?: number };
    conversionRate?: number;
  };
  check("quotes total = 2", summaryData.quotes?.total === 2);
  check("quotes accepted = 1", summaryData.quotes?.accepted === 1);
  check("sales confirmed = 2", summaryData.sales?.total === 2);
  check("sales amount = 438", summaryData.sales?.amount === 438);
  check("customers = 2", summaryData.customers?.total === 2);
  check("products = 2", summaryData.products?.total === 2);
}

async function runHttpTests(seedData: Seed, baseUrl: string): Promise<void> {
  console.log("\n--- HTTP flow ---");

  console.log("\nAuth checks");
  const noAuth = await fetch(`${baseUrl}/api/internal/assistant/messages`);
  check("401 without token", noAuth.status === 401);

  const { token: agentToken } = await login(
    baseUrl,
    seedData.agentUserA.email,
    seedData.agentUserA.password,
  );
  const agentRes = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
    headers: { authorization: `Bearer ${agentToken}` },
  });
  check("403 for AGENT role", agentRes.status === 403);

  const badBody = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
    method: "POST",
    headers: {
      authorization: "Bearer x",
      "content-type": "application/json",
    },
    body: JSON.stringify({ content: "" }),
  });
  check("401 for invalid token", badBody.status === 401);

  console.log("\nHistory + send + reset (tenant A)");
  const { token: adminAToken } = await login(
    baseUrl,
    seedData.adminA.email,
    seedData.adminA.password,
  );
  const adminAHeaders = {
    authorization: `Bearer ${adminAToken}`,
    "content-type": "application/json",
  };

  const history0 = await fetch(
    `${baseUrl}/api/internal/assistant/messages`,
    { headers: adminAHeaders },
  );
  check("initial history is empty", history0.status === 200 && (await history0.json()).length === 0);

  const send = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
    method: "POST",
    headers: adminAHeaders,
    body: JSON.stringify({ content: "dame el resumen de mi negocio" }),
  });
  check("send message 200", send.status === 200);
  const sendBody = (await send.json()) as { conversationId?: string; reply?: string };
  check("conversationId returned", typeof sendBody.conversationId === "string");
  check(
    "reply is a business summary (offline LLM)",
    typeof sendBody.reply === "string" && sendBody.reply.includes("Resumen de tu negocio"),
    sendBody.reply,
  );
  check(
    "reply does not leak secrets",
    !JSON.stringify(sendBody).includes("sk-qa-secret"),
  );

  const history1 = await fetch(
    `${baseUrl}/api/internal/assistant/messages`,
    { headers: adminAHeaders },
  );
  const history1Body = (await history1.json()) as Array<{ role: string }>;
  check("history now has 2 messages", history1Body.length === 2, JSON.stringify(history1Body));
  check(
    "history roles USER then ASSISTANT",
    history1Body[0]?.role === "USER" && history1Body[1]?.role === "ASSISTANT",
  );

  const reset = await fetch(`${baseUrl}/api/internal/assistant/reset`, {
    method: "POST",
    headers: adminAHeaders,
  });
  check("reset 200 {ok:true}", reset.status === 200 && ((await reset.json()) as { ok?: boolean }).ok === true);

  console.log("\nTenant isolation over HTTP");
  const { token: adminBToken } = await login(
    baseUrl,
    seedData.adminB.email,
    seedData.adminB.password,
  );
  const adminBHeaders = {
    authorization: `Bearer ${adminBToken}`,
    "content-type": "application/json",
  };

  const historyB = await fetch(
    `${baseUrl}/api/internal/assistant/messages`,
    { headers: adminBHeaders },
  );
  check(
    "tenant B does NOT see tenant A messages",
    historyB.status === 200 && (await historyB.json()).length === 0,
  );

  const sendB = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
    method: "POST",
    headers: adminBHeaders,
    body: JSON.stringify({ content: "resumen de negocio de B" }),
  });
  check("tenant B can send", sendB.status === 200);
  const sendBReply = ((await sendB.json()) as { reply?: string }).reply ?? "";
  check(
    "tenant B reply reflects only B's data (quotes 1)",
    sendBReply.includes("Cotizaciones: 1"),
    sendBReply,
  );

  const historyA2 = await fetch(
    `${baseUrl}/api/internal/assistant/messages`,
    { headers: adminAHeaders },
  );
  const historyA2Body = (await historyA2.json()) as Array<{ content: string }>;
  check(
    "tenant A still sees only its own messages",
    historyA2.status === 200 &&
      historyA2Body.every((m) => !String(m.content).includes("negocio de B")),
  );

  const invalid = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
    method: "POST",
    headers: adminAHeaders,
    body: JSON.stringify({ content: "   " }),
  });
  check("empty content -> 400", invalid.status === 400);
}

async function cleanup(seedData: Seed): Promise<void> {
  const { tenantAId, tenantBId } = seedData;

  const ids = [tenantAId, tenantBId];

  await AssistantMessage.deleteMany({ tenantId: { $in: ids } });
  await AssistantConversation.deleteMany({ tenantId: { $in: ids } });
  await Sale.deleteMany({ tenantId: { $in: ids } });
  await Quote.deleteMany({ tenantId: { $in: ids } });
  await Customer.deleteMany({ tenantId: { $in: ids } });
  await Product.deleteMany({ tenantId: { $in: ids } });
  await Channel.deleteMany({ tenantId: { $in: ids } });
  await CommercialPolicy.deleteMany({ tenantId: { $in: ids } });
  await Agent.deleteMany({ tenantId: { $in: ids } });
  await User.deleteMany({ tenantId: { $in: ids } });
  await Tenant.deleteMany({ _id: { $in: ids } });
}

async function main(): Promise<void> {
  console.log("Connecting to test DB:", TEST_URI.replace(/\/\/[^@]*@/, "//***@"));
  await mongoose.connect(TEST_URI);

  const seedData = await seed();
  console.log("Seeded tenants:", seedData.tenantAId, seedData.tenantBId);

  const { default: app } = await import("../src/app.js");

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log("API base:", baseUrl);

  await runToolTests(seedData);
  await runHttpTests(seedData, baseUrl);

  server.close();

  await cleanup(seedData);
  console.log("Cleaned up test tenants.");

  await mongoose.disconnect();
}

main()
  .then(() => {
    if (failures > 0) {
      console.log(`\nRESULT: ${failures} FAILURE(S)`);
      process.exit(1);
    }
    console.log("\nRESULT: ALL TESTS PASSED");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nRESULT: ERROR", error);
    process.exit(1);
  });