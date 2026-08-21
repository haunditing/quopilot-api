import "dotenv/config";
import app from "./app.js";
import env from "./config/env.js";
import { connectToDatabase } from "./database/mongodb.js";
import { startConversationSweeper } from "./services/conversation-sweeper-service.js";

async function startServer(): Promise<void> {
  try {
    await connectToDatabase();

    startConversationSweeper();

    app.listen(env.port, () => {
      console.log(`QuoPilot API running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start QuoPilot API", error);
    process.exit(1);
  }
}

startServer();