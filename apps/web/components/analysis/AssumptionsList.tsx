import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { SeverityBadge } from "./SeverityBadge";

export function AssumptionsList({
  assumptions
}: {
  assumptions: {
    assumption: string;
    whyItMightBeWrong: string;
    severity: "Critical" | "High" | "Medium";
    validationEvidence: string[];
  }[];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="font-display text-xl text-white">Hidden Assumptions</CardHeader>
      <CardContent className="space-y-4">
        {assumptions.map((assumption) => (
          <div key={assumption.assumption} className="border border-border p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-display text-lg text-zinc-100">{assumption.assumption}</h3>
              <SeverityBadge severity={assumption.severity} />
            </div>
            <p className="terminal-text">{assumption.whyItMightBeWrong}</p>
            <div className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              What would prove it
            </div>
            <ul className="mt-2 space-y-2 terminal-text">
              {assumption.validationEvidence.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

