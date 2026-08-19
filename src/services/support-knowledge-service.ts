import { SupportKnowledgeDoc } from "../models/SupportKnowledgeDoc.js";

export interface KnowledgeSearchResult {
  doc: {
    _id: string;
    title: string;
    module: string;
    summary: string;
    content: string;
    keywords: string[];
  };
  score: number;
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function scoreText(queryTokens: Set<string>, haystack: string): number {
  const haystackTokens = tokenize(haystack);

  if (haystackTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of queryTokens) {
    if (haystackTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(queryTokens.size, haystackTokens.size);
}

function scoreDoc(queryTokens: Set<string>, doc: {
  title: string;
  summary: string;
  content: string;
  keywords: string[];
}): number {
  const titleScore = scoreText(queryTokens, doc.title) * 1.4;
  const keywordScore = scoreText(queryTokens, doc.keywords.join(" ")) * 1.2;
  const summaryScore = scoreText(queryTokens, doc.summary);
  const contentScore = scoreText(queryTokens, doc.content) * 0.6;

  return Math.min(
    1,
    titleScore + keywordScore + summaryScore + contentScore,
  );
}

export async function searchKnowledge(
  tenantId: string,
  query: string,
  limit = 3,
  minScore = 0.3,
): Promise<KnowledgeSearchResult[]> {
  const queryTokens = tokenize(query);

  const docs = await SupportKnowledgeDoc.find({
    tenantId,
    enabled: true,
  })
    .select("title module summary content keywords")
    .lean();

  const scored: KnowledgeSearchResult[] = docs
    .map((doc) => ({
      doc: {
        _id: doc._id.toString(),
        title: doc.title,
        module: doc.module,
        summary: doc.summary,
        content: doc.content,
        keywords: doc.keywords,
      },
      score: scoreDoc(queryTokens, doc),
    }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export async function listKnowledgeDocs(tenantId: string) {
  return SupportKnowledgeDoc.find({ tenantId }).sort({ createdAt: -1 }).lean();
}

export async function getKnowledgeDoc(tenantId: string, docId: string) {
  return SupportKnowledgeDoc.findOne({ tenantId, _id: docId }).lean();
}

export async function createKnowledgeDoc(tenantId: string, input: {
  title: string;
  module: string;
  summary?: string;
  content: string;
  keywords?: string[];
  enabled?: boolean;
}) {
  const doc = await SupportKnowledgeDoc.create({
    tenantId,
    title: input.title,
    module: input.module,
    summary: input.summary ?? "",
    content: input.content,
    keywords: input.keywords ?? [],
    enabled: input.enabled ?? true,
  });

  return doc.toObject();
}

export async function updateKnowledgeDoc(
  tenantId: string,
  docId: string,
  input: {
    title?: string;
    module?: string;
    summary?: string;
    content?: string;
    keywords?: string[];
    enabled?: boolean;
  },
) {
  const doc = await SupportKnowledgeDoc.findOneAndUpdate(
    { tenantId, _id: docId },
    {
      $set: input,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();

  if (!doc) {
    throw new Error("Knowledge document not found");
  }

  return doc;
}

export async function deleteKnowledgeDoc(tenantId: string, docId: string) {
  const doc = await SupportKnowledgeDoc.findOneAndDelete({ tenantId, _id: docId }).lean();

  if (!doc) {
    throw new Error("Knowledge document not found");
  }

  return { id: docId };
}