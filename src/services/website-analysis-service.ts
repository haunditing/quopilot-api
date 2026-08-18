import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface WebsiteAnalysisResult {
  url: string;
  finalUrl: string;
  title?: string;
  text: string;
  characterCount: number;
  truncated: boolean;
}

export interface AnalyzeWebsiteOptions {
  url: string;
  maxBytes?: number;
  maxChars?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_CHARS = 12000;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_REDIRECTS = 3;

const USER_AGENT =
  "QuoPilotBot/1.0 (+https://quopilot.app)";

export class WebsiteAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteAnalysisError";
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return true;
  }

  const [a, b] = octets;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51) return true;
  if (a === 203 && b === 113) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();

  if (isIP(normalized) === 4) {
    return isPrivateIpv4(normalized);
  }

  if (isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
    if (normalized.startsWith("ff")) return true;

    const v4Mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);

    if (v4Mapped) {
      return isPrivateIpv4(v4Mapped[1]);
    }

    return false;
  }

  return true;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new WebsiteAnalysisError(
        `Blocked request to private IP address: ${hostname}`,
      );
    }

    return;
  }

  let addresses: string[];

  try {
    const resolved = await lookup(hostname, { all: true });

    addresses = resolved.map((entry) => entry.address);
  } catch {
    throw new WebsiteAnalysisError(`Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new WebsiteAnalysisError(`Could not resolve host: ${hostname}`);
  }

  const privateAddress = addresses.find(isPrivateIp);

  if (privateAddress) {
    throw new WebsiteAnalysisError(
      `Blocked request to non-public address (${privateAddress}) for host: ${hostname}`,
    );
  }
}

function parseUrl(raw: string): URL {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new WebsiteAnalysisError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new WebsiteAnalysisError("Only http and https URLs are allowed");
  }

  if (!url.hostname) {
    throw new WebsiteAnalysisError("URL must include a hostname");
  }

  if (url.username || url.password) {
    throw new WebsiteAnalysisError("URLs with embedded credentials are not allowed");
  }

  return url;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = parseUrl(raw);

  await assertPublicHostname(url.hostname);

  return url;
}

function decodeEntities(html: string): string {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const codepoint = Number(code);

      return codepoint > 0 && codepoint <= 0x10ffff
        ? String.fromCodePoint(codepoint)
        : "";
    });
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);

  if (!match) {
    return undefined;
  }

  return match[1].replace(/\s+/g, " ").trim() || undefined;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}…`;
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > maxBytes) {
    throw new WebsiteAnalysisError(
      `Page too large (${contentLength} bytes, max ${maxBytes})`,
    );
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder("utf-8");

  let received = 0;

  const chunks: string[] = [];

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      received += value.byteLength;

      if (received > maxBytes) {
        throw new WebsiteAnalysisError(
          `Page exceeds ${maxBytes} bytes limit`,
        );
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join("") + decoder.decode();
}

async function fetchWithRedirects(
  url: URL,
  options: {
    maxBytes: number;
    timeoutMs: number;
    maxRedirects: number;
    redirectsLeft: number;
  },
): Promise<{ response: Response; finalUrl: string }> {
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
        "Accept-Language": "es,en;q=0.8",
      },
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      if (options.redirectsLeft <= 0) {
        throw new WebsiteAnalysisError("Too many redirects");
      }

      const location = response.headers.get("location")!;

      const nextUrl = await assertSafeUrl(new URL(location, url).toString());

      return fetchWithRedirects(nextUrl, {
        ...options,
        redirectsLeft: options.redirectsLeft - 1,
      });
    }

    return {
      response,
      finalUrl: url.toString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeWebsite(
  input: AnalyzeWebsiteOptions,
): Promise<WebsiteAnalysisResult> {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = input.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const url = await assertSafeUrl(input.url.trim());

  const { response, finalUrl } = await fetchWithRedirects(url, {
    maxBytes,
    timeoutMs,
    maxRedirects,
    redirectsLeft: maxRedirects,
  });

  if (!response.ok) {
    throw new WebsiteAnalysisError(`Page returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new WebsiteAnalysisError(
      `Unsupported content type: ${contentType || "unknown"}`,
    );
  }

  const html = await readBodyWithLimit(response, maxBytes);

  const text = truncateText(decodeEntities(extractText(html)), maxChars);

  if (!text) {
    throw new WebsiteAnalysisError("No readable text found on the page");
  }

  return {
    url: input.url.trim(),
    finalUrl,
    title: extractTitle(html),
    text,
    characterCount: text.length,
    truncated: text.length >= maxChars,
  };
}