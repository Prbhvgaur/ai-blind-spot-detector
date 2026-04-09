import { describe, expect, it } from "vitest";

import { AnalysisResultSchema } from "@blindspot/shared";

import {
  analysisIdParamsSchema,
  createAnalysisBodySchema,
  enqueueAnalysisResponseSchema,
  getAnalysisQuerySchema,
  listAnalysesQuerySchema,
  sseEventSchema,
  streamAnalysisQuerySchema,
  toggleShareBodySchema
} from "./analysis.schema";
import { buildAdversarialPrompt } from "./prompts";

describe("analysis prompt builder", () => {
  it("embeds the required JSON-only contract", () => {
    const prompt = buildAdversarialPrompt("We should launch a new AI startup this quarter.");

    expect(prompt).toContain("Return ONLY valid JSON");
    expect(prompt).toContain("\"counterarguments\"");
    expect(prompt).toContain("defensiblePercentage + wishfulThinkingPercentage = 100");
  });
});

describe("analysis result schema", () => {
  it("accepts a correctly structured blind spot report", () => {
    const result = AnalysisResultSchema.parse({
      summary: "The idea has upside, but it assumes the market wants another AI wrapper and underestimates acquisition risk.",
      counterarguments: [
        {
          title: "Distribution will be the real bottleneck",
          argument: "You are acting as if product quality is the primary constraint, but similar tools are already saturating the market. Without an unfair acquisition advantage, this becomes a race to the bottom where distribution economics dominate long before model quality does.",
          refutationEvidence: ["Signed design partners with conversion intent", "CAC payback under 6 months", "Retention curve stronger than incumbent alternatives"]
        },
        {
          title: "The wedge may be too weak",
          argument: "The plan assumes a pain point that is intense enough to create urgency, yet nothing in the proposal demonstrates acute pain, budget ownership, or workflow lock-in. If the problem is merely interesting rather than expensive, adoption will stall after curiosity.",
          refutationEvidence: ["Budget line already allocated", "Workflow currently costs measurable money", "Buyers agree to replace an existing tool"]
        },
        {
          title: "Execution risk is underestimated",
          argument: "The roadmap compresses product, GTM, and model-evaluation work into a quarter as if they are independent. In reality, each uncertainty compounds the others and one slip can invalidate the whole timeline.",
          refutationEvidence: ["Sequenced milestone plan with dependencies", "Named owners for each critical path item", "Operating buffer for launch delay"]
        }
      ],
      assumptions: [
        {
          assumption: "Customers will trust the system quickly",
          whyItMightBeWrong: "Trust in a contrarian tool is hard to earn because the product intentionally tells users they may be wrong.",
          severity: "High",
          validationEvidence: ["Pilot user interview transcripts", "Observed repeat usage after first report"]
        },
        {
          assumption: "The market is large enough for a standalone product",
          whyItMightBeWrong: "Many teams may see this as a feature inside an existing workflow rather than a separate subscription.",
          severity: "Critical",
          validationEvidence: ["Willingness-to-pay interviews", "Standalone procurement intent"]
        },
        {
          assumption: "Users will paste strategically important inputs",
          whyItMightBeWrong: "High-stakes reasoning often contains sensitive information that buyers hesitate to share with external AI services.",
          severity: "Critical",
          validationEvidence: ["Security objections tracked during sales", "Conversion by sensitivity level of submitted content"]
        },
        {
          assumption: "The value is obvious from one run",
          whyItMightBeWrong: "If the first report feels generic, credibility collapses before the user experiences longer-term benefit.",
          severity: "High",
          validationEvidence: ["First-session completion rate", "User-rated usefulness on first run"]
        },
        {
          assumption: "Free usage will convert into paid plans",
          whyItMightBeWrong: "The product may be valuable episodically rather than frequently, which weakens subscription fit.",
          severity: "Medium",
          validationEvidence: ["Free-to-paid conversion rate", "Analysis frequency among active users"]
        }
      ],
      expertPersonas: [
        {
          name: "Maya Chen",
          title: "VP of Product, Enterprise Analytics",
          background: "Built decision-support platforms for regulated industries where auditability matters more than novelty.",
          coreObjection: "The product is persuasive, but the trust layer is too thin for enterprise adoption.",
          unansweredQuestion: "How will you prove the report is grounded rather than theatrically skeptical?",
          seenFailInSimilarSituations: "She has seen smart analysis products die because teams could not operationalize the output inside existing review workflows."
        },
        {
          name: "Daniel Okafor",
          title: "B2B SaaS Growth Advisor",
          background: "Scaled multiple vertical SaaS products from zero to eight figures in ARR.",
          coreObjection: "The positioning is sharp, but the acquisition path is vague and may depend on founder-led evangelism for too long.",
          unansweredQuestion: "What repeatable distribution channel works before brand authority exists?",
          seenFailInSimilarSituations: "He has seen insight products attract applause and press without establishing a durable acquisition engine."
        },
        {
          name: "Elena Petrov",
          title: "AI Risk Research Lead",
          background: "Evaluates model reliability, failure modes, and evaluation frameworks for frontier AI deployments.",
          coreObjection: "You are selling skepticism without a rigorous measurement framework for false positives and false negatives.",
          unansweredQuestion: "How will you know when the detector invents blind spots instead of surfacing real ones?",
          seenFailInSimilarSituations: "She has seen evaluation tools lose trust because they optimized for sounding incisive rather than being predictively useful."
        }
      ],
      blindSpotReport: [
        {
          title: "Distribution risk masked as product confidence",
          severityScore: 9,
          severity: "Critical",
          explanation: "The plan treats distribution as downstream execution instead of the primary determinant of viability."
        },
        {
          title: "Weak proof of repeat behavior",
          severityScore: 8,
          severity: "Critical",
          explanation: "There is little evidence that users need this often enough for a monthly subscription."
        },
        {
          title: "Security and confidentiality objections underexplored",
          severityScore: 6,
          severity: "High",
          explanation: "Sensitive inputs may never reach the product unless trust objections are resolved early."
        },
        {
          title: "Evaluation rigor not specified",
          severityScore: 4,
          severity: "Medium",
          explanation: "The system needs a way to prove its critiques predict better outcomes rather than simply sounding intelligent."
        }
      ],
      confidenceAudit: {
        defensiblePercentage: 42,
        wishfulThinkingPercentage: 58,
        defensibleJustification: "There is a real pain point around AI over-agreement, but the evidence for repeat demand and durable GTM leverage is still thin.",
        wishfulThinkingExamples: ["Assuming strong retention without usage proof", "Assuming users will trust the system with sensitive strategic material"],
        verdict: "Major rethink needed"
      }
    });

    expect(result.counterarguments).toHaveLength(3);
    expect(result.confidenceAudit.defensiblePercentage + result.confidenceAudit.wishfulThinkingPercentage).toBe(100);
  });
});

describe("analysis route schemas", () => {
  it("validates creation payloads and trims input", () => {
    const input = createAnalysisBodySchema.parse({
      input: `  ${"A".repeat(60)}  `
    });

    expect(input.input).toHaveLength(60);
    expect(() => createAnalysisBodySchema.parse({ input: "too short" })).toThrow();
  });

  it("validates ids and paginated list queries", () => {
    expect(analysisIdParamsSchema.parse({ id: "analysis_123" })).toEqual({
      id: "analysis_123"
    });

    expect(
      listAnalysesQuerySchema.parse({
        page: "2",
        limit: "25"
      })
    ).toEqual({
      page: 2,
      limit: 25
    });

    expect(listAnalysesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10
    });

    expect(() => listAnalysesQuerySchema.parse({ limit: "99" })).toThrow();
  });

  it("accepts optional share and stream tokens", () => {
    expect(getAnalysisQuerySchema.parse({})).toEqual({});
    expect(getAnalysisQuerySchema.parse({ shareToken: "share_123" })).toEqual({
      shareToken: "share_123"
    });
    expect(streamAnalysisQuerySchema.parse({})).toEqual({});
    expect(streamAnalysisQuerySchema.parse({ accessToken: "token_123" })).toEqual({
      accessToken: "token_123"
    });
  });

  it("validates share toggles, enqueue responses, and SSE payloads", () => {
    expect(toggleShareBodySchema.parse({ isPublic: true })).toEqual({
      isPublic: true
    });
    expect(toggleShareBodySchema.parse({})).toEqual({});

    expect(
      enqueueAnalysisResponseSchema.parse({
        analysisId: "analysis_123",
        status: 202
      })
    ).toEqual({
      analysisId: "analysis_123",
      status: 202
    });

    expect(
      sseEventSchema.parse({
        event: "complete",
        analysisId: "analysis_123",
        status: "COMPLETE",
        message: "Analysis complete",
        result: {
          summary: "Counterarguments outweighed the current evidence.",
          counterarguments: [
            {
              title: "Distribution is unproven",
              argument: "The idea still lacks a credible path to repeatable demand.",
              refutationEvidence: ["Signed pilots", "Evidence of repeat usage"]
            },
            {
              title: "The workflow may be too episodic",
              argument: "Occasional need is not always enough for a subscription business.",
              refutationEvidence: ["Weekly usage patterns", "Retention data"]
            },
            {
              title: "Trust must be earned",
              argument: "Users will hesitate to rely on a contrarian system without proof it improves decisions.",
              refutationEvidence: ["Outcome comparisons", "Case studies"]
            }
          ],
          assumptions: [
            {
              assumption: "Users will return frequently",
              whyItMightBeWrong: "The use case may be periodic instead of recurring.",
              severity: "High",
              validationEvidence: ["Cohort retention", "Session frequency"]
            },
            {
              assumption: "Teams will trust external AI with strategy",
              whyItMightBeWrong: "Sensitive inputs create adoption friction.",
              severity: "Critical",
              validationEvidence: ["Security reviews", "Trial completion rate"]
            },
            {
              assumption: "Insight quality is immediately obvious",
              whyItMightBeWrong: "Users may need longitudinal proof before trusting the critiques.",
              severity: "Medium",
              validationEvidence: ["NPS after first run", "Repeat activation"]
            },
            {
              assumption: "Pricing matches value frequency",
              whyItMightBeWrong: "Monthly subscriptions can misfit episodic products.",
              severity: "High",
              validationEvidence: ["Willingness-to-pay interviews", "Upgrade rate"]
            },
            {
              assumption: "The critique is differentiated",
              whyItMightBeWrong: "If the output sounds generic, the product will not feel essential.",
              severity: "Medium",
              validationEvidence: ["Benchmarking against alternatives", "User preference tests"]
            }
          ],
          expertPersonas: [
            {
              name: "Jordan Reyes",
              title: "Enterprise Strategy Director",
              background: "Leads strategic planning in a regulated SaaS company.",
              coreObjection: "The product lacks a clear trust model for high-stakes users.",
              unansweredQuestion: "How do we know the detector improves outcomes instead of sounding skeptical?",
              seenFailInSimilarSituations: "He has seen decision-support tools fail when their rigor could not be explained."
            },
            {
              name: "Priya Sharma",
              title: "Growth Advisor",
              background: "Helps B2B software companies find repeatable distribution.",
              coreObjection: "The market thesis is stronger than the GTM thesis.",
              unansweredQuestion: "What acquisition channel works before category awareness exists?",
              seenFailInSimilarSituations: "She has seen sharp products stall because distribution was not validated early."
            },
            {
              name: "Noah Kim",
              title: "AI Evaluation Lead",
              background: "Builds evaluation systems for production LLM products.",
              coreObjection: "The system needs a measurement framework for false positives and false negatives.",
              unansweredQuestion: "How will you distinguish a real blind spot from an invented one?",
              seenFailInSimilarSituations: "He has seen critique tools lose trust when they optimized for tone over predictive utility."
            }
          ],
          blindSpotReport: [
            {
              title: "Distribution proof is thin",
              severityScore: 9,
              severity: "Critical",
              explanation: "The argument assumes demand capture before channel evidence exists."
            },
            {
              title: "Retention is assumed",
              severityScore: 8,
              severity: "Critical",
              explanation: "The report lacks evidence that users will return frequently."
            },
            {
              title: "Trust friction is under-modeled",
              severityScore: 6,
              severity: "High",
              explanation: "Sensitive strategic inputs may reduce willingness to use the tool."
            },
            {
              title: "Measurement rigor is incomplete",
              severityScore: 4,
              severity: "Medium",
              explanation: "The system still needs a clearer framework for judging critique quality."
            }
          ],
          confidenceAudit: {
            defensiblePercentage: 45,
            wishfulThinkingPercentage: 55,
            defensibleJustification: "There is a real problem, but the evidence is still early.",
            wishfulThinkingExamples: ["Assuming strong retention", "Assuming trust without validation"],
            verdict: "Proceed with caution"
          }
        }
      })
    ).toMatchObject({
      event: "complete",
      analysisId: "analysis_123",
      status: "COMPLETE"
    });
  });
});
