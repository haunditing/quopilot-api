import { Conversation } from "../models/Conversation.js";
import env from "../config/env.js";
import { closeConversation } from "./agent-conversation-service.js";

export async function sweepIdleConversations(): Promise<number> {
  const cutoff = new Date(Date.now() - env.conversationIdleTimeoutMs);

  const stale = await Conversation.find({
    status: "OPEN",
    channel: "WEB_CHAT",
    $or: [
      {
        lastMessageAt: {
          $lt: cutoff,
        },
      },
      {
        lastMessageAt: {
          $exists: false,
        },
        createdAt: {
          $lt: cutoff,
        },
      },
    ],
  })
    .select({
      tenantId: 1,
    })
    .lean();

  let closed = 0;

  for (const conversation of stale) {
    try {
      await closeConversation({
        tenantId: conversation.tenantId.toString(),
        conversationId: conversation._id.toString(),
        closedBy: "SYSTEM",
      });

      closed += 1;
    } catch (error) {
      if (error instanceof Error && error.message === "Conversation is closed") {
        continue;
      }

      console.error(
        "[conversation-sweeper] failed to close conversation:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (closed > 0) {
    console.log(
      `[conversation-sweeper] closed ${closed} idle conversation(s) after ${Math.round(env.conversationIdleTimeoutMs / 60000)} minute(s) of inactivity`,
    );
  }

  return closed;
}

export function startConversationSweeper(): NodeJS.Timeout {
  let sweeping = false;

  async function run() {
    if (sweeping) {
      return;
    }

    sweeping = true;

    try {
      await sweepIdleConversations();
    } catch (error) {
      console.error(
        "[conversation-sweeper] sweep failed:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      sweeping = false;
    }
  }

  const interval = setInterval(() => {
    void run();
  }, env.conversationSweepIntervalMs);

  interval.unref();

  void run();

  return interval;
}
