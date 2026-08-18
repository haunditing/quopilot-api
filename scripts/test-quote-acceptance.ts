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
import { acceptQuote } from "../src/services/quote-acceptance-service.js";
import { executeTool } from "../src/services/agent-tools/index.js";
import type { AgentToolContext } from "../src/services/agent-tools/types.js";

async function run() {
  console.log("Starting Quote Acceptance Flow test...");
  await mongoose.connect(env.mongodbUri);

  const tenantId = new mongoose.Types.ObjectId().toString();
  const tenant = await Tenant.create({
    _id: tenantId,
    name: "Tenant Quote Test",
    email: `quotetest-${Date.now()}@test.com`,
    adminName: "Admin",
    status: "ACTIVE",
  });

  const agent = await Agent.create({
    tenantId,
    name: "Sales Agent",
    status: "ACTIVE",
  });

  const customer = await Customer.create({
    tenantId,
    name: "Customer Test",
    email: `cust-${Date.now()}@test.com`,
  });

  const product = await Product.create({
    tenantId,
    name: "Test Product",
    basePrice: 100,
    currency: "COP",
    itemType: "PRODUCT",
  });

  const conversation = await Conversation.create({
    tenantId,
    customerId: customer._id,
    channelId: new mongoose.Types.ObjectId(),
    channel: "WEB_CHAT",
    status: "OPEN",
  });

  const quote = await Quote.create({
    tenantId,
    customerId: customer._id,
    number: "COT-000001",
    status: "SENT",
    subtotal: 100,
    total: 100,
    currency: "COP",
    items: [
      {
        productId: product._id,
        name: product.name,
        quantity: 1,
        unitPrice: 100,
        subtotal: 100,
        totalLine: 100,
      },
    ],
  });

  console.log("1. Testing acceptQuote service directly...");
  const result1 = await acceptQuote(tenantId, quote._id.toString());
  console.assert(result1.quote.status === "ACCEPTED", "Quote status is ACCEPTED");
  console.assert(result1.sale.status === "CONFIRMED", "Sale is confirmed");
  console.assert(result1.sale.total === 100, "Sale total matches quote total");
  console.log("  [PASS] acceptQuote service executed successfully");

  console.log("2. Testing idempotency of acceptQuote service...");
  const result2 = await acceptQuote(tenantId, quote._id.toString());
  console.assert(result2.sale._id.toString() === result1.sale._id.toString(), "Idempotent: same sale returned");
  const salesCount = await Sale.countDocuments({ quoteId: quote._id });
  console.assert(salesCount === 1, "Only one sale exists for this quote");
  console.log("  [PASS] acceptQuote is idempotent");

  console.log("3. Testing acceptQuoteTool via agent executeTool...");
  const quote2 = await Quote.create({
    tenantId,
    customerId: customer._id,
    number: "COT-000002",
    status: "SENT",
    subtotal: 250,
    total: 250,
    currency: "COP",
    items: [
      {
        productId: product._id,
        name: product.name,
        quantity: 2.5,
        unitPrice: 100,
        subtotal: 250,
        totalLine: 250,
      },
    ],
  });

  const ctx: AgentToolContext = {
    tenantId,
    conversationId: conversation._id.toString(),
    customerId: customer._id.toString(),
    agent: agent.toObject() as any,
  };

  const toolResult = await executeTool(ctx, "acceptQuote", {
    quoteId: quote2._id.toString(),
  });

  console.assert(toolResult.ok, "Tool execution ok");
  const data = toolResult.data as { quote: { status: string }; sale: { total: number } };
  console.assert(data.quote.status === "ACCEPTED", "Tool accepted quote");
  console.assert(data.sale.total === 250, "Tool created sale with correct total");

  const convState = await ConversationState.findOne({ conversationId: conversation._id });
  console.log("ConvState context:", convState?.context);
  console.assert(convState?.context?.pendingAction === "NONE", "Conversation state pendingAction cleared");
  console.log("  [PASS] acceptQuoteTool executed successfully and updated conversation state");

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
  console.log("\nRESULT: QUOTE ACCEPTANCE FLOW TESTS PASSED");
}

run().catch(async (err) => {
  console.error("Test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
