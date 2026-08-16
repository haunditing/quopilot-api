import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = "v1";

export interface EncryptedValue {
  algorithm: "AES-256-GCM";
  keyVersion: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getSecret(): string {
  const secret = process.env.CHANNEL_SECRET ?? process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("CHANNEL_SECRET is not defined");
  }

  return secret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): EncryptedValue {
  const key = deriveKey(getSecret());

  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    algorithm: "AES-256-GCM",
    keyVersion: KEY_VERSION,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedValue): string {
  const key = deriveKey(getSecret());

  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "••••••••";
  }

  return `${value.slice(0, 3)}••••••••${value.slice(-3)}`;
}

export function isEncryptedValue(
  value: unknown,
): value is EncryptedValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "algorithm" in value &&
    "iv" in value &&
    "tag" in value &&
    "ciphertext" in value
  );
}
