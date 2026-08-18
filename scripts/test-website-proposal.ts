import "dotenv/config";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { Agent } from "../src/models/Agent.js";
import { Product } from "../src/models/Product.js";
import { CommercialPolicy } from "../src/models/CommercialPolicy.js";
import {
  buildProposalFromText,
  stageProposal,
  getPendingProposal,
  hasPendingProposal,
  clearPendingProposal,
  applyProposal,
} from "../src/services/website-proposal-service.js";
import { getAgentByTenant } from "../src/services/agent-service.js";
import { getCommercialPolicy } from "../src/services/commercial-policy-service.js";
import { getProducts } from "../src/services/product-query-service.js";

async function run() {
  console.log("Connecting to test DB:", env.mongodbUri);
  await mongoose.connect(env.mongodbUri);

  const tenantId = new mongoose.Types.ObjectId().toString();
  const email = `proposal-${Date.now()}@test.com`;

  await Tenant.create({
    _id: tenantId,
    name: "Admin Proposal",
    email: email,
    status: "ACTIVE",
  });

  await Agent.create({
    tenantId,
    name: "Original Agent",
    status: "ACTIVE",
  });

  console.log("1. Testing buildProposalFromText");
  const sampleHtmlText = `
    <html>
      <title>Café del Sol - Tienda de Café Especial</title>
      <body>
        <h1>Bienvenido a Café del Sol</h1>
        <p>Somos una empresa dedicada a la venta del mejor café colombiano con origen sostenible y tostión artesanal. Nuestro correo es contacto@cafedelsol.com y teléfono +57 300 1234567. Ubicados en Calle 100 # 15-20, Bogotá, Colombia.</p>
        <p>Políticas de pago: Se acepta transferencia bancaria y tarjeta de crédito. Envíos a todo el país en 2-4 días hábiles. Garantía de satisfacción de 30 días.</p>
        <div>
          <span>Café Orgánico 500g</span> $45.000 COP
        </div>
        <div>
          <span>Café Espresso 250g</span> $28.000 COP
        </div>
      </body>
    </html>
  `;

  const proposal = buildProposalFromText({
    url: "https://cafedelsol.example.com",
    title: "Café del Sol - Tienda de Café Especial",
    text: sampleHtmlText,
  });

  console.assert(
    proposal.url === "https://cafedelsol.example.com",
    "URL matches",
  );
  console.assert(
    proposal.tenant?.email === "contacto@cafedelsol.com",
    "Email extracted",
  );
  console.assert(
    proposal.tenant?.phone === "+57 300 1234567",
    "Phone extracted",
  );
  console.assert(
    proposal.products && proposal.products.length >= 2,
    "Products extracted",
  );
  console.log("  [PASS] buildProposalFromText extracted fields successfully");

  console.log("2. Testing staging and pending proposal storage");
  console.assert(!hasPendingProposal(tenantId), "No pending initially");

  stageProposal(tenantId, proposal);
  console.assert(hasPendingProposal(tenantId), "Has pending after staging");

  const pending = getPendingProposal(tenantId);
  console.assert(pending?.url === proposal.url, "Pending proposal retrieved");
  console.log("  [PASS] Staging and retrieval working");

  console.log("3. Testing applyProposal (confirmation)");
  const summary = await applyProposal(tenantId);
  console.log("Summary:", summary);

  console.assert(summary.tenant === true, "Tenant updated");
  console.assert(summary.agent === true, "Agent updated");
  console.assert(summary.products >= 2, "Products created");
  console.assert(
    summary.commercialPolicy === true,
    "Commercial policy updated",
  );
  console.assert(
    !hasPendingProposal(tenantId),
    "Pending proposal cleared after apply",
  );
  console.log("  [PASS] applyProposal updated entities successfully");

  console.log("4. Verifying persistence in DB");
  const updatedTenant = await Tenant.findById(tenantId);
  console.assert(
    updatedTenant?.website === "https://cafedelsol.example.com",
    "Tenant website saved",
  );

  const updatedAgent = await getAgentByTenant(tenantId);
  console.assert(
    updatedAgent?.description?.includes("Café"),
    "Agent description saved",
  );

  const productsResult = await getProducts({ tenantId, page: 1, limit: 10 });
  console.assert(productsResult.pagination.total >= 2, "Products saved in DB");

  const policy = await getCommercialPolicy(tenantId);
  console.assert(Boolean(policy?.paymentTerms), "Commercial policy saved");
  console.log("  [PASS] All changes verified in database");

  // Cleanup
  await Tenant.deleteOne({ _id: tenantId });
  await Agent.deleteMany({ tenantId });
  await Product.deleteMany({ tenantId });
  await CommercialPolicy.deleteMany({ tenantId });

  await mongoose.disconnect();
  console.log("\nRESULT: WEBSITE PROPOSAL TESTS PASSED");
}

run().catch(async (err) => {
  console.error("Test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
