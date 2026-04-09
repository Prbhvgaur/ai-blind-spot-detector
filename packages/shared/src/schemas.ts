import { z } from "zod";

export const SeveritySchema = z.enum(["Critical", "High", "Medium"]);
export const PlanSchema = z.enum(["FREE", "PRO"]);
export const AnalysisStatusSchema = z.enum(["PENDING", "PROCESSING", "COMPLETE", "FAILED"]);

export const CounterargumentSchema = z.object({
  title: z.string().min(3),
  argument: z.string().min(30),
  refutationEvidence: z.array(z.string().min(5)).min(2).max(5)
});

export const HiddenAssumptionSchema = z.object({
  assumption: z.string().min(5),
  whyItMightBeWrong: z.string().min(20),
  severity: SeveritySchema,
  validationEvidence: z.array(z.string().min(5)).min(2).max(4)
});

export const ExpertPersonaSchema = z.object({
  name: z.string().min(3),
  title: z.string().min(3),
  background: z.string().min(20),
  coreObjection: z.string().min(20),
  unansweredQuestion: z.string().min(10),
  seenFailInSimilarSituations: z.string().min(20)
});

export const BlindSpotItemSchema = z.object({
  title: z.string().min(3),
  severityScore: z.number().int().min(1).max(10),
  severity: SeveritySchema,
  explanation: z.string().min(20)
});

export const ConfidenceAuditSchema = z.object({
  defensiblePercentage: z.number().int().min(0).max(100),
  wishfulThinkingPercentage: z.number().int().min(0).max(100),
  defensibleJustification: z.string().min(20),
  wishfulThinkingExamples: z.array(z.string().min(5)).min(2).max(5),
  verdict: z.enum(["Proceed with caution", "Major rethink needed", "Fundamentally flawed"])
}).refine(
  (value) => value.defensiblePercentage + value.wishfulThinkingPercentage === 100,
  {
    message: "Confidence percentages must sum to 100"
  }
);

export const AnalysisResultSchema = z.object({
  summary: z.string().min(30),
  counterarguments: z.array(CounterargumentSchema).length(3),
  assumptions: z.array(HiddenAssumptionSchema).min(5).max(8),
  expertPersonas: z.array(ExpertPersonaSchema).length(3),
  blindSpotReport: z.array(BlindSpotItemSchema).min(4).max(8),
  confidenceAudit: ConfidenceAuditSchema
});

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  plan: PlanSchema,
  analysisCount: z.number().int().min(0),
  remainingFreeAnalyses: z.number().int().min(0),
  subscriptionStatus: z.string().nullable(),
  subscriptionEndsAt: z.string().datetime().nullable()
});

export const PublicAnalysisSchema = z.object({
  id: z.string(),
  status: AnalysisStatusSchema,
  input: z.string(),
  createdAt: z.string().datetime(),
  isPublic: z.boolean(),
  shareToken: z.string().nullable(),
  result: AnalysisResultSchema.nullable()
});

export const PaginatedAnalysesSchema = z.object({
  items: z.array(PublicAnalysisSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
});

