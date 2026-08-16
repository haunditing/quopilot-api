const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }

  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function truncateToTokens(
  text: string,
  maxTokens: number,
): {
  text: string;
  truncated: boolean;
} {
  if (estimateTokens(text) <= maxTokens) {
    return {
      text,
      truncated: false,
    };
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN;

  let cut = text.slice(0, maxChars);

  const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));

  if (boundary > maxChars * 0.6) {
    cut = cut.slice(0, boundary);
  }

  return {
    text: `${cut.trimEnd()}\n[... contexto omitido]`,
    truncated: true,
  };
}
