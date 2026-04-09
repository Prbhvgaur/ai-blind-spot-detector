"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Link2, LoaderCircle, Radar, ScanSearch } from "lucide-react";
import { useSession } from "next-auth/react";

import { BlindSpotReport } from "@/components/analysis/BlindSpotReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useSubscription } from "@/hooks/useSubscription";

const stages = [
  { key: "queued", label: "Queued", icon: Radar },
  { key: "processing", label: "Interrogating", icon: ScanSearch },
  { key: "complete", label: "Report Ready", icon: BrainCircuit },
  { key: "failed", label: "Failed", icon: AlertTriangle }
] as const;

const defaultPrompt =
  "Paste an idea, strategy memo, AI conversation, or decision you want challenged. The system will surface the arguments your current thinking is most likely suppressing.";

export function AnalysisInput() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const { data: me } = useSubscription(accessToken);
  const { currentAnalysis, stage, error, shareUrl, startAnalysis, createShareLink } = useAnalysis(accessToken);
  const [input, setInput] = useState(defaultPrompt);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charCount = input.length;
  const freeUsageText = useMemo(() => {
    if (!me || me.plan === "PRO") {
      return "Pro plan active";
    }

    return `${me.analysisCount} of 3 free analyses used`;
  }, [me]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="font-display text-4xl text-white">Interrogate This Idea</div>
          <p className="max-w-3xl font-mono text-sm text-zinc-400">
            Your AI can help you think faster. This is the system that forces it to think harder.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Textarea value={input} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)} />
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            <span>{freeUsageText}</span>
            <span>{charCount} / 10000</span>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={isSubmitting || charCount < 50}
            onClick={async () => {
              try {
                setIsSubmitting(true);
                await startAnalysis(input);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "INTERROGATING..." : "INTERROGATE THIS IDEA"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="font-display text-lg text-white">Live Analysis Progress</CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {stages.map(({ key, label, icon: Icon }) => {
            const active =
              (stage === "queued" && key === "queued") ||
              (stage === "processing" && (key === "queued" || key === "processing")) ||
              (stage === "complete" && key !== "failed") ||
              (stage === "failed" && key === "failed");

            return (
              <div
                key={key}
                className={`border px-4 py-4 ${active ? "border-accent bg-accent/10 text-amber-100" : "border-border bg-zinc-950/60 text-zinc-500"}`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">{label}</span>
                </div>
                <div className="font-mono text-xs">
                  {stage === key
                    ? key === "processing"
                      ? "Streaming progress from the adversarial pipeline"
                      : "Current stage"
                    : "Waiting"}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {error ? (
        <div className="border border-critical/50 bg-critical/10 px-4 py-4 font-mono text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {currentAnalysis?.result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-display text-2xl text-white">Blind Spot Report</div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const url = await createShareLink();
                  if (url) {
                    await navigator.clipboard.writeText(url);
                  }
                }}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {shareUrl ? "Copied Share Link" : "Create Share Link"}
              </Button>
              {stage === "processing" ? (
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-amber-200">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Updating
                </div>
              ) : null}
            </div>
          </div>
          <BlindSpotReport analysis={currentAnalysis} />
        </div>
      ) : null}
    </div>
  );
}
