import "dotenv/config";
import mongoose from "mongoose";
import app from "../src/app.js";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { Agent } from "../src/models/Agent.js";
import { Channel } from "../src/models/Channel.js";
import { Customer } from "../src/models/Customer.js";
import { startPublicChat } from "../src/services/agent-public-service.js";

async function run() {
  console.log("Starting WebChat Security test...");
  await mongoose.connect(env.mongodbUri);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const address = server.address() as import("node:net").AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const tenant1Id = new mongoose.Types.ObjectId().toString();
  const tenant2Id = new mongoose.Types.ObjectId().toString();

  await Tenant.create({
    _id: tenant1Id,
    name: "Tenant 1",
    email: `t1-${Date.now()}@test.com`,
    status: "ACTIVE",
  });
  const agent1 = await Agent.create({
    tenantId: tenant1Id,
    name: "Agent 1",
    status: "ACTIVE",
  });
  await Channel.create({
    tenantId: tenant1Id,
    agentId: agent1._id,
    type: "WEB_CHAT",
    name: "WebChat 1",
    status: "ACTIVE",
  });

  await Tenant.create({
    _id: tenant2Id,
    name: "Tenant 2",
    email: `t2-${Date.now()}@test.com`,
    status: "ACTIVE",
  });
  const agent2 = await Agent.create({
    tenantId: tenant2Id,
    name: "Agent 2",
    status: "ACTIVE",
  });
  await Channel.create({
    tenantId: tenant2Id,
    agentId: agent2._id,
    type: "WEB_CHAT",
    name: "WebChat 2",
    status: "ACTIVE",
  });

  // Start chat for Tenant 1
  const chat1 = await startPublicChat({
    tenantId: tenant1Id,
    name: "Customer 1",
    email: "c1@test.com",
  });

  // Start chat for Tenant 2
  const chat2 = await startPublicChat({
    tenantId: tenant2Id,
    name: "Customer 2",
    email: "c2@test.com",
  });

  console.log(
    "1. Testing access to Tenant 1 conversation with Tenant 2 token...",
  );
  const resCrossTenant = await fetch(
    `${baseUrl}/api/agent/public/chat/${tenant1Id}/conversations/${chat1.conversationId}/messages`,
    {
      headers: { "x-chat-token": chat2.token },
    },
  );
  console.assert(
    resCrossTenant.status === 403,
    "Cross-tenant access returns 403",
  );
  console.log("  [PASS] Cross-tenant access blocked successfully (403)");

  console.log(
    "2. Testing access to Tenant 1 conversation with another conversation's token (same tenant)...",
  );
  const chat1b = await startPublicChat({
    tenantId: tenant1Id,
    name: "Customer 1b",
    email: "c1b@test.com",
  });

  const resCrossConv = await fetch(
    `${baseUrl}/api/agent/public/chat/${tenant1Id}/conversations/${chat1.conversationId}/messages`,
    {
      headers: { "x-chat-token": chat1b.token },
    },
  );
  console.assert(
    resCrossConv.status === 403,
    "Cross-conversation access returns 403",
  );
  console.log("  [PASS] Cross-conversation access blocked successfully (403)");

  console.log("3. Testing access with valid token...");
  const resValid = await fetch(
    `${baseUrl}/api/agent/public/chat/${tenant1Id}/conversations/${chat1.conversationId}/messages`,
    {
      headers: { "x-chat-token": chat1.token },
    },
  );
  console.assert(resValid.status === 200, "Valid token access returns 200");
  console.log("  [PASS] Valid token access allowed (200)");

  // Cleanup
  await Tenant.deleteMany({ _id: { $in: [tenant1Id, tenant2Id] } });
  await Agent.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
  await Channel.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
  await Customer.deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
  await mongoose.connection
    .collection("conversations")
    .deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });
  await mongoose.connection
    .collection("messages")
    .deleteMany({ tenantId: { $in: [tenant1Id, tenant2Id] } });

  server.close();
  await mongoose.disconnect();
  console.log("\nRESULT: WEBCHAT SECURITY TESTS PASSED");
}

run().catch(async (err) => {
  console.error("WebChat security test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
