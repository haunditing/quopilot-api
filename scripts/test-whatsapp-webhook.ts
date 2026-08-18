import "dotenv/config";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { Agent } from "../src/models/Agent.js";
import { Channel } from "../src/models/Channel.js";
import { Customer } from "../src/models/Customer.js";
import { Message } from "../src/models/Message.js";
import { createChannel } from "../src/services/channel-service.js";
import { processWhatsAppWebhook } from "../src/services/channel-webhook-service.js";
import { toRuntimeChannel } from "../src/services/channel-query-service.js";

async function run() {
  console.log("Starting WhatsApp Webhook test with realistic Meta payload...");
  await mongoose.connect(env.mongodbUri);

  const tenantId = new mongoose.Types.ObjectId().toString();
  await Tenant.create({
    _id: tenantId,
    name: "Tenant WhatsApp Test",
    email: `watest-${Date.now()}@test.com`,
    status: "ACTIVE",
  });

  const agent = await Agent.create({
    tenantId,
    name: "WhatsApp Agent",
    status: "ACTIVE",
  });

  const channelDoc = await createChannel(tenantId, {
    type: "WHATSAPP",
    name: "WhatsApp Channel",
    status: "ACTIVE",
    agentId: agent._id.toString(),
    config: {
      phoneNumberId: "123456789",
      phoneNumber: "+573001234567",
    },
    credentials: {
      accessToken: "mock-token",
      verifyToken: "mock-verify",
    },
  });

  const runtimeChannel = toRuntimeChannel(channelDoc);

  const realisticPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "123456",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "123456789",
                phone_number_id: "123456789",
              },
              contacts: [
                {
                  profile: {
                    name: "Maria Perez",
                  },
                  wa_id: "573009876543",
                },
              ],
              messages: [
                {
                  from: "573009876543",
                  id: "wamid.HBgLNTczMDA5ODc2NTQzVBADEgA5Q0Q5QkU4QTJBREVBNTc1NEEA",
                  timestamp: "1720000000",
                  text: {
                    body: "Hola, ¿qué productos de café tienen disponibles?",
                  },
                  type: "text",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  console.log("1. Processing realistic WhatsApp webhook payload...");
  const result = await processWhatsAppWebhook(runtimeChannel, realisticPayload);
  console.assert(result.processed === 1, "One message processed successfully");
  console.log("  [PASS] Webhook processed 1 message");

  console.log("2. Verifying customer creation and message persistence...");
  const customer = await Customer.findOne({
    tenantId,
    whatsappId: "573009876543",
  });
  console.assert(Boolean(customer), "Customer created from WhatsApp message");
  console.assert(
    customer?.name === "Maria Perez",
    "Customer name extracted correctly",
  );

  const message = await Message.findOne({
    tenantId,
    externalMessageId:
      realisticPayload.entry[0].changes[0].value.messages[0].id,
  });
  console.assert(Boolean(message), "Inbound message persisted in database");
  console.assert(
    message?.content === "Hola, ¿qué productos de café tienen disponibles?",
    "Message content correct",
  );
  console.log("  [PASS] Customer and message persistence verified");

  console.log("3. Testing idempotency / duplicate message protection...");
  const resultDuplicate = await processWhatsAppWebhook(
    runtimeChannel,
    realisticPayload,
  );
  console.assert(
    resultDuplicate.processed === 0,
    "Duplicate message ignored (0 processed)",
  );
  console.log("  [PASS] Duplicate message protection working");

  // Cleanup
  await Tenant.deleteOne({ _id: tenantId });
  await Agent.deleteMany({ tenantId });
  await Channel.deleteMany({ tenantId });
  await Customer.deleteMany({ tenantId });
  await Message.deleteMany({ tenantId });
  await mongoose.connection
    .collection("conversations")
    .deleteMany({ tenantId });

  await mongoose.disconnect();
  console.log("\nRESULT: WHATSAPP WEBHOOK TESTS PASSED");
}

run().catch(async (err) => {
  console.error("WhatsApp webhook test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
