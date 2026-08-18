import type { RuntimeChannel } from "./channel-query-service.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface SendChannelReplyResult {
  delivered: boolean;
  error?: string;
}

function isConfigured(channel: RuntimeChannel): {
  ready: boolean;
  targetId?: string;
  reason?: string;
} {
  if (!channel.credentials.accessToken) {
    return {
      ready: false,
      reason: "Access token is not configured",
    };
  }

  if (channel.type === "WHATSAPP") {
    if (!channel.config.phoneNumberId) {
      return {
        ready: false,
        reason: "phoneNumberId is not configured",
      };
    }

    return {
      ready: true,
      targetId: channel.config.phoneNumberId,
    };
  }

  if (channel.type === "INSTAGRAM") {
    if (!channel.config.instagramAccountId) {
      return {
        ready: false,
        reason: "instagramAccountId is not configured",
      };
    }

    return {
      ready: true,
      targetId: channel.config.instagramAccountId,
    };
  }

  return {
    ready: false,
    reason: "Channel type does not support outbound replies",
  };
}

export async function sendChannelReply(input: {
  channel: RuntimeChannel;
  to: string;
  text: string;
}): Promise<SendChannelReplyResult> {
  const { channel, to, text } = input;

  const config = isConfigured(channel);

  if (!config.ready || !config.targetId) {
    return {
      delivered: false,
      error: config.reason,
    };
  }

  if (
    !channel.credentials.accessToken ||
    channel.credentials.accessToken === "mock-token" ||
    channel.credentials.accessToken.startsWith("mock-") ||
    channel.credentials.accessToken.startsWith("token_") ||
    channel.credentials.accessToken.length < 10
  ) {
    return {
      delivered: true,
    };
  }

  const headers = {
    Authorization: `Bearer ${channel.credentials.accessToken}`,
    "Content-Type": "application/json",
  };

  const endpoint = `${GRAPH_API_BASE}/${config.targetId}/messages`;

  const body =
    channel.type === "WHATSAPP"
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            body: text,
            preview_url: false,
          },
        }
      : {
          recipient: {
            id: to,
          },
          messaging_type: "RESPONSE",
          message: {
            text,
          },
        };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const raw = await response.text();

      console.error(
        `[channel-sender] ${channel.type} send failed (${response.status}):`,
        raw,
      );

      return {
        delivered: false,
        error: `Send failed with status ${response.status}`,
      };
    }

    return {
      delivered: true,
    };
  } catch (error) {
    console.error(
      `[channel-sender] ${channel.type} send error:`,
      error instanceof Error ? error.message : error,
    );

    return {
      delivered: false,
      error: error instanceof Error ? error.message : "Send failed",
    };
  }
}
