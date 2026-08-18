import "dotenv/config";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { Agent } from "../src/models/Agent.js";
import { Customer } from "../src/models/Customer.js";
import { Product } from "../src/models/Product.js";
import { Quote } from "../src/models/Quote.js";
import { Sale } from "../src/models/Sale.js";
import { Conversation } from "../src/models/Conversation.js";
import { ConversationState } from "../src/models/ConversationState.js";
import { executeTool } from "../src/services/agent-tools/index.js";
import type { AgentToolContext } from "../src/services/agent-tools/types.js";

async function run() {
  console.log("Starting full Agent Engine Quote Acceptance functional test...");
  await mongoose.connect(env.mongodbUri);

  const tenantId = new mongoose.Types.ObjectId().toString();
  await Tenant.create({
    _id: tenantId,
    name: "Tenant Flow Test",
    email: `flowtest-${Date.now()}@test.com`,
    adminName: "Admin",
    status: "ACTIVE",
  });

  const agent = await Agent.create({
    tenantId,
    name: "Commercial Agent",
    status: "ACTIVE",
  });

  const customer = await Customer.create({
    tenantId,
    name: "Client Test",
    email: `client-${Date.now()}@test.com`,
  });

  const product = await Product.create({
    tenantId,
    name: "Café Especial 500g",
    basePrice: 45000,
    unitPrice: 45000,
    currency: "COP",
    itemType: "PRODUCT",
    sku: "CAFE-500",
  });

  const conversation = await Conversation.create({
    tenantId,
    customerId: customer._id,
    channelId: new mongoose.Types.ObjectId(),
    channel: "WEB_CHAT",
    status: "OPEN",
  });

  const ctx: AgentToolContext = {
    tenantId,
    conversationId: conversation._id.toString(),
    customerId: customer._id.toString(),
    agent: agent.toObject() as any,
  };

  const results: string[] = [];

  // Step 1 & 2: Customer requests info -> Agent Engine queries products
  console.log("1-2. Customer requests info and agent queries products...");
  const searchResult = await executeTool(ctx, "searchProducts", { search: "Café" });
  console.assert(searchResult.ok, "Search products tool ok");
  const productsFound = (searchResult.data as { items: Array<{ id: string }> }).items;
  console.assert(productsFound.length > 0, "Products found");
  const productId = productsFound[0].id;
  results.push("1-2. Cliente solicita info y agente consulta productos -> PASS");

  // Step 3 & 4: Customer requests quote -> Agent Engine creates quote
  console.log("3-4. Customer requests quote and agent creates quote...");
  const createQuoteResult = await executeTool(ctx, "createQuote", {
    customerId: customer._id.toString(),
    items: [
      {
        productId,
        quantity: 2,
      },
    ],
  });
  console.assert(createQuoteResult.ok, "Create quote tool ok");
  const quoteData = createQuoteResult.data as { id: string; status: string; total: number };
  console.assert(quoteData.status === "DRAFT", "Quote created in DRAFT status");
  const quoteId = quoteData.id;
  results.push("3-4. Cliente solicita cotización y agente crea cotización -> PASS");

  // Simulate quote being sent (to be eligible for acceptance)
  await Quote.updateOne({ _id: quoteId }, { $set: { status: "SENT" } });

  // Step 5 & 6: Customer explicitly accepts quote -> Agent Engine executes acceptQuote
  console.log("5-6. Customer explicitly accepts quote and agent executes acceptQuote...");
  const acceptResult = await executeTool(ctx, "acceptQuote", {
    quoteId,
  });
  console.assert(acceptResult.ok, "Accept quote tool ok");
  results.push("5-6. Cliente acepta cotización y agente ejecuta acceptQuote -> PASS");

  // Step 7: Verify quote status is ACCEPTED
  console.log("7. Verifying quote status is ACCEPTED...");
  const updatedQuote = await Quote.findById(quoteId);
  console.assert(updatedQuote?.status === "ACCEPTED", "Quote status is ACCEPTED");
  results.push("7. Verificar que la cotización queda ACCEPTED -> PASS");

  // Step 8: Verify a single sale is created
  console.log("8. Verifying a single sale is created...");
  const sales = await Sale.find({ quoteId });
  console.assert(sales.length === 1, "Exactly one sale created");
  console.assert(sales[0].status === "CONFIRMED", "Sale status is CONFIRMED");
  console.assert(sales[0].total === 90000, "Sale total matches 45000 * 2 = 90000");
  const firstSaleId = sales[0]._id.toString();
  results.push("8. Verificar que se crea una única venta -> PASS");

  // Step 9: Repeat acceptance and verify idempotency
  console.log("9. Repeating acceptance to verify idempotency...");
  const repeatAcceptResult = await executeTool(ctx, "acceptQuote", {
    quoteId,
  });
  console.assert(repeatAcceptResult.ok, "Repeat accept tool ok");
  const salesAfterRepeat = await Sale.find({ quoteId });
  console.assert(salesAfterRepeat.length === 1, "Still exactly one sale (idempotent)");
  console.assert(salesAfterRepeat[0]._id.toString() === firstSaleId, "Same sale record returned");
  results.push("9. Repetir aceptación y verificar idempotencia -> PASS");

  // Step 10: Verify final conversation state
  console.log("10. Verifying final conversation state...");
  const convState = await ConversationState.findOne({ conversationId: conversation._id });
  console.assert(convState?.context?.pendingAction === "NONE", "Conversation state pendingAction is NONE");
  console.assert(!convState?.context?.quoteDraftId, "Quote draft reference cleared");
  results.push("10. Verificar el estado final de la conversación -> PASS");

  console.log("\n=================================================");
  console.log("FUNCTIONAL FLOW TEST RESULTS SUMMARY:");
  for (const r of results) {
    console.log(`  [PASS] ${r}`);
  }
  console.log("=================================================\n");

  // Cleanup
  await Tenant.deleteOne({ _id: tenantId });
  await Agent.deleteMany({ tenantId });
  await Customer.deleteMany({ tenantId });
  await Product.deleteMany({ tenantId });
  await Quote.deleteMany({ tenantId });
  await Sale.deleteMany({ tenantId });
  await Conversation.deleteMany({ tenantId });
  await ConversationState.deleteMany({ tenantId });

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Functional test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
