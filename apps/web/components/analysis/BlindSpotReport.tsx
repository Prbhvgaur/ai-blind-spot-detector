"use client";

import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { AssumptionsList } from "./AssumptionsList";
import { ConfidenceAudit } from "./ConfidenceAudit";
import { ExpertPersonas } from "./ExpertPersonas";
import { SeverityBadge } from "./SeverityBadge";

export function BlindSpotReport({ analysis }: { analysis: NonNullable<any> }) {
  const result = analysis.result;

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="transition-all duration-300">
        <ConfidenceAudit audit={result.confidenceAudit} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="transition-all duration-300">
          <Card className="h-full">
            <CardHeader className="font-display text-xl text-white">Blind Spot Report</CardHeader>
            <CardContent className="space-y-4">
              {result.blindSpotReport.map((item: any) => (
                <div key={item.title} className="border border-border p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="font-display text-lg text-zinc-100">{item.title}</div>
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={item.severity} />
                      <div className="font-mono text-sm text-zinc-400">{item.severityScore}/10</div>
                    </div>
                  </div>
                  <p className="terminal-text">{item.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="transition-all duration-300">
          <AssumptionsList assumptions={result.assumptions} />
        </div>
      </div>

      <div className="transition-all duration-300">
        <ExpertPersonas personas={result.expertPersonas} />
      </div>

      <div className="transition-all duration-300">
        <Card>
          <CardHeader className="font-display text-xl text-white">Counterarguments</CardHeader>
          <CardContent>
            <Accordion
              items={result.counterarguments.map((item: any) => ({
                title: item.title,
                content: (
                  <div className="space-y-4">
                    <p className="terminal-text">{item.argument}</p>
                    <div>
                      <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Evidence needed to refute it
                      </div>
                      <ul className="space-y-2 terminal-text">
                        {item.refutationEvidence.map((evidence: string) => (
                          <li key={evidence}>• {evidence}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
