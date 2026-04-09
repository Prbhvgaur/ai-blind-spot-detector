import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ConfidenceAudit({
  audit
}: {
  audit: {
    defensiblePercentage: number;
    wishfulThinkingPercentage: number;
    defensibleJustification: string;
    wishfulThinkingExamples: string[];
    verdict: string;
  };
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="font-display text-xl text-white">Confidence Audit</div>
        <Badge className="border-accent/50 bg-accent/10 text-amber-100">{audit.verdict}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-2">
          <div className="font-display text-6xl text-accent">{audit.defensiblePercentage}%</div>
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">Defensible</div>
          <div className="font-mono text-sm text-zinc-400">
            Wishful thinking: {audit.wishfulThinkingPercentage}%
          </div>
        </div>
        <div className="space-y-4 terminal-text">
          <p>{audit.defensibleJustification}</p>
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
              Wishful Thinking Examples
            </div>
            <ul className="space-y-2">
              {audit.wishfulThinkingExamples.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

