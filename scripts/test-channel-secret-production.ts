import assert from "node:assert";

async function run() {
  console.log("Testing production CHANNEL_SECRET enforcement...");

  const originalNodeEnv = process.env.NODE_ENV;
  const originalChannelSecret = process.env.CHANNEL_SECRET;
  const originalMongoUri = process.env.MONGODB_URI;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.CHANNEL_SECRET;
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";

    let threw = false;
    try {
      await import(`../src/config/env.js?update=${Date.now()}`);
    } catch (err) {
      threw = true;
      console.log("Caught error:", (err as Error).message);
      console.assert(
        (err as Error).message.includes("CHANNEL_SECRET is required in production"),
        "Error message matches expected production requirement",
      );
    }

    assert.strictEqual(threw, true, "App should throw error when CHANNEL_SECRET is missing in production");
    console.log("  [PASS] Production mode correctly fails when CHANNEL_SECRET is missing");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalChannelSecret) {
      process.env.CHANNEL_SECRET = originalChannelSecret;
    } else {
      delete process.env.CHANNEL_SECRET;
    }
    if (originalMongoUri) {
      process.env.MONGODB_URI = originalMongoUri;
    } else {
      delete process.env.MONGODB_URI;
    }
  }

  console.log("\nRESULT: CHANNEL_SECRET PRODUCTION TESTS PASSED");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
