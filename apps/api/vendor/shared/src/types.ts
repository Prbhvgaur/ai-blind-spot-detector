import type { z } from "zod";

import type {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  BlindSpotItemSchema,
  ConfidenceAuditSchema,
  CounterargumentSchema,
  ExpertPersonaSchema,
  HiddenAssumptionSchema,
  PaginatedAnalysesSchema,
  PlanSchema,
  PublicAnalysisSchema,
  UserProfileSchema
} from "./schemas";

export type Severity = "Critical" | "High" | "Medium";
export type Plan = z.infer<typeof PlanSchema>;
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;
export type Counterargument = z.infer<typeof CounterargumentSchema>;
export type HiddenAssumption = z.infer<typeof HiddenAssumptionSchema>;
export type ExpertPersona = z.infer<typeof ExpertPersonaSchema>;
export type BlindSpotItem = z.infer<typeof BlindSpotItemSchema>;
export type ConfidenceAudit = z.infer<typeof ConfidenceAuditSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type PublicAnalysis = z.infer<typeof PublicAnalysisSchema>;
export type PaginatedAnalyses = z.infer<typeof PaginatedAnalysesSchema>;
