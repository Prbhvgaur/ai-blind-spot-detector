import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ExpertPersonas({
  personas
}: {
  personas: {
    name: string;
    title: string;
    background: string;
    coreObjection: string;
    unansweredQuestion: string;
    seenFailInSimilarSituations: string;
  }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {personas.map((persona) => (
        <Card key={persona.name}>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-accent font-display text-xl text-accent">
              {persona.name.charAt(0)}
            </div>
            <div>
              <div className="font-display text-lg text-white">{persona.name}</div>
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                {persona.title}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 terminal-text">
            <p>{persona.background}</p>
            <p>{persona.coreObjection}</p>
            <div className="border border-accent/40 bg-accent/10 p-3 text-amber-100">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-amber-200/70">
                The question they&apos;d ask you
              </div>
              {persona.unansweredQuestion}
            </div>
            <p>{persona.seenFailInSimilarSituations}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

