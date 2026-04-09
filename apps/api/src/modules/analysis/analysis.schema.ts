import { z } from "zod";

import {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  PaginatedAnalysesSchema,
  PublicAnalysisSchema
} from "@blindspot/shared";

export const createAnalysisBodySchema = z.object({
  input: z.string().trim().min(50).max(10000)
});

export const analysisIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const listAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export const getAnalysisQuerySchema = z.object({
  shareToken: z.string().optional()
});

export const streamAnalysisQuerySchema = z.object({
  accessToken: z.string().optional()
});

export const toggleShareBodySchema = z.object({
  isPublic: z.boolean().optional()
});

export const enqueueAnalysisResponseSchema = z.object({
  analysisId: z.string(),
  status: z.literal(202)
});

export const analysisResponseSchema = PublicAnalysisSchema;
export const paginatedAnalysisResponseSchema = PaginatedAnalysesSchema;

export const sseEventSchema = z.object({
  event: z.enum(["queued", "processing", "complete", "failed"]),
  analysisId: z.string(),
  status: AnalysisStatusSchema,
  message: z.string(),
  result: AnalysisResultSchema.optional()
});

