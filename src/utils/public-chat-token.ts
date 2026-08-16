import jwt, { JwtPayload } from "jsonwebtoken";

export interface PublicChatTokenPayload extends JwtPayload {
  scope: "public-chat";
  tenantId: string;
  conversationId: string;
  customerId: string;
}

function getSecret(): string {
  const secret = process.env.PUBLIC_CHAT_SECRET ?? process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("PUBLIC_CHAT_SECRET is not defined");
  }

  return secret;
}

interface SignPublicChatTokenInput {
  tenantId: string;
  conversationId: string;
  customerId: string;
}

export function signPublicChatToken(
  input: SignPublicChatTokenInput,
): string {
  return jwt.sign(
    {
      scope: "public-chat",
      ...input,
    },
    getSecret(),
    {
      expiresIn: "30d",
    },
  );
}

export function verifyPublicChatToken(
  token: string,
): PublicChatTokenPayload {
  return jwt.verify(token, getSecret()) as PublicChatTokenPayload;
}
