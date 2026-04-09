import crypto from "node:crypto";

import { FREE_ANALYSIS_LIMIT } from "../../config/constants";
import { ANALYSIS_RESULT_CACHE_TTL_SECONDS } from "../../config/constants";
import { redis } from "../../lib/redis";
import { getAnalysisResultCacheKey } from "./analysis.queue";

export const serializeAnalysis = (analysis: any) => ({
  id: analysis.id,
  status: analysis.status,
  input: analysis.input,
  createdAt: analysis.createdAt.toISOString(),
  isPublic: analysis.isPublic,
  shareToken: analysis.shareToken,
  result:
    analysis.summary &&
    analysis.counterarguments &&
    analysis.assumptions &&
    analysis.expertPersonas &&
    analysis.blindSpotReport &&
    analysis.confidenceAudit
      ? {
          summary: analysis.summary,
          counterarguments: analysis.counterarguments,
          assumptions: analysis.assumptions,
          expertPersonas: analysis.expertPersonas,
          blindSpotReport: analysis.blindSpotReport,
          confidenceAudit: analysis.confidenceAudit
        }
      : null
});

export const countUserAnalyses = async (prisma: any, userId: string) =>
  prisma.analysis.count({
    where: {
      userId,
      input: {
        not: "[deleted by user]"
      }
    }
  });

export const assertAnalysisQuota = async (prisma: any, user: any) => {
  if (user.plan === "PRO") {
    return;
  }

  const totalAnalyses = await countUserAnalyses(prisma, user.id);
  const usedAnalyses = Math.max(user.analysisCount, totalAnalyses);

  if (usedAnalyses >= FREE_ANALYSIS_LIMIT) {
    throw new Error("Free analysis limit reached");
  }
};

export const createAnalysisRecord = async (prisma: any, userId: string, input: string) =>
  prisma.analysis.create({
    data: {
      userId,
      input,
      status: "PENDING"
    }
  });

export const getAnalysisForViewer = async (
  prisma: any,
  analysisId: string,
  viewerId?: string,
  shareToken?: string
) => {
  const cacheKey = getAnalysisResultCacheKey(analysisId);
  const cached = await redis.get(cacheKey);

  if (cached && viewerId) {
    return JSON.parse(cached);
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId }
  });

  if (!analysis) {
    return null;
  }

  const isOwner = viewerId === analysis.userId;
  const hasValidShareToken = Boolean(shareToken && analysis.isPublic && analysis.shareToken === shareToken);

  if (!isOwner && !hasValidShareToken) {
    return null;
  }

  const serialized = serializeAnalysis(analysis);

  if (serialized.result) {
    await redis.set(cacheKey, JSON.stringify(serialized), "EX", ANALYSIS_RESULT_CACHE_TTL_SECONDS);
  }

  return serialized;
};

export const listAnalysesForUser = async (prisma: any, userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.analysis.count({
      where: { userId }
    })
  ]);

  return {
    items: items.map(serializeAnalysis),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const toggleAnalysisShare = async (prisma: any, analysisId: string, userId: string, requestedState?: boolean) => {
  const current = await prisma.analysis.findFirstOrThrow({
    where: {
      id: analysisId,
      userId
    }
  });

  const isPublic = requestedState ?? !current.isPublic;

  const updated = await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      isPublic,
      shareToken: isPublic ? current.shareToken ?? crypto.randomBytes(16).toString("hex") : null
    }
  });

  return serializeAnalysis(updated);
};

export const softDeleteAnalysis = async (prisma: any, analysisId: string, userId: string) => {
  const current = await prisma.analysis.findFirstOrThrow({
    where: {
      id: analysisId,
      userId
    }
  });

  const updated = await prisma.analysis.update({
    where: { id: current.id },
    data: {
      input: "[deleted by user]",
      status: "FAILED",
      summary: null,
      counterarguments: null,
      assumptions: null,
      expertPersonas: null,
      blindSpotReport: null,
      confidenceAudit: null,
      isPublic: false,
      shareToken: null
    }
  });

  await redis.del(getAnalysisResultCacheKey(analysisId));
  return serializeAnalysis(updated);
};
