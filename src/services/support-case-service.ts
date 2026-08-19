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
  query: string,
  limit = 3,
  minScore = 0.5,
): Promise<CaseSearchResult[]> {
  const queryTokens = tokenize(query);

  const cases = await SupportCase.find()
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

export async function listSupportCases() {
  return SupportCase.find().sort({ createdAt: -1 }).lean();
}

export async function getSupportCase(caseId: string) {
  return SupportCase.findById(caseId).lean();
}

export async function createSupportCase(input: {
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords?: string[];
  status?: "RESOLVED" | "VERIFIED";
}) {
  const caseDoc = await SupportCase.create({
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
  const caseDoc = await SupportCase.findByIdAndUpdate(
    caseId,
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

export async function confirmSupportCase(caseId: string) {
  const caseDoc = await SupportCase.findByIdAndUpdate(
    caseId,
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

export async function deleteSupportCase(caseId: string) {
  const caseDoc = await SupportCase.findByIdAndDelete(caseId).lean();

  if (!caseDoc) {
    throw new Error("Support case not found");
  }

  return { id: caseId };
}