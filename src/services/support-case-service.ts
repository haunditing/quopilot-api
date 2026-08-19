import { SupportCase } from "../models/SupportCase.js";

export interface CaseSearchResult {
  caseDoc: {
    _id: string;
    title: string;
    module: string;
    problem: string;
    solution: string;
    keywords: string[];
    confirmedCount: number;
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

function scoreCase(queryTokens: Set<string>, caseDoc: {
  title: string;
  problem: string;
  solution: string;
  keywords: string[];
}): number {
  const titleScore = scoreText(queryTokens, caseDoc.title) * 1.4;
  const keywordScore = scoreText(queryTokens, caseDoc.keywords.join(" ")) * 1.2;
  const problemScore = scoreText(queryTokens, caseDoc.problem);
  const solutionScore = scoreText(queryTokens, caseDoc.solution) * 0.8;

  return Math.min(
    1,
    titleScore + keywordScore + problemScore + solutionScore,
  );
}

export async function searchCases(
  tenantId: string,
  query: string,
  limit = 3,
  minScore = 0.5,
): Promise<CaseSearchResult[]> {
  const queryTokens = tokenize(query);

  const cases = await SupportCase.find({ tenantId })
    .select("title module problem solution keywords confirmedCount")
    .lean();

  const scored: CaseSearchResult[] = cases
    .map((caseDoc) => ({
      caseDoc: {
        _id: caseDoc._id.toString(),
        title: caseDoc.title,
        module: caseDoc.module,
        problem: caseDoc.problem,
        solution: caseDoc.solution,
        keywords: caseDoc.keywords,
        confirmedCount: caseDoc.confirmedCount,
      },
      score: scoreCase(queryTokens, caseDoc),
    }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export async function listSupportCases(tenantId: string) {
  return SupportCase.find({ tenantId }).sort({ createdAt: -1 }).lean();
}

export async function getSupportCase(tenantId: string, caseId: string) {
  return SupportCase.findOne({ tenantId, _id: caseId }).lean();
}

export async function createSupportCase(tenantId: string, input: {
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords?: string[];
  status?: "RESOLVED" | "VERIFIED";
}) {
  const caseDoc = await SupportCase.create({
    tenantId,
    title: input.title,
    module: input.module,
    problem: input.problem,
    solution: input.solution,
    keywords: input.keywords ?? [],
    status: input.status ?? "RESOLVED",
  });

  return caseDoc.toObject();
}

export async function updateSupportCase(
  tenantId: string,
  caseId: string,
  input: {
    title?: string;
    module?: string;
    problem?: string;
    solution?: string;
    keywords?: string[];
    status?: "RESOLVED" | "VERIFIED";
  },
) {
  const caseDoc = await SupportCase.findOneAndUpdate(
    { tenantId, _id: caseId },
    {
      $set: input,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();

  if (!caseDoc) {
    throw new Error("Support case not found");
  }

  return caseDoc;
}

export async function confirmSupportCase(tenantId: string, caseId: string) {
  const caseDoc = await SupportCase.findOneAndUpdate(
    { tenantId, _id: caseId },
    {
      $inc: {
        confirmedCount: 1,
      },
      $set: {
        status: "VERIFIED",
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!caseDoc) {
    throw new Error("Support case not found");
  }

  return caseDoc;
}

export async function deleteSupportCase(tenantId: string, caseId: string) {
  const caseDoc = await SupportCase.findOneAndDelete({ tenantId, _id: caseId }).lean();

  if (!caseDoc) {
    throw new Error("Support case not found");
  }

  return { id: caseId };
}