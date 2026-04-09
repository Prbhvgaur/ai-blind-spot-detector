"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PublicAnalysis } from "@blindspot/shared";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["history", session?.accessToken],
    queryFn: () => api.listAnalyses(session!.accessToken, 1, 20),
    enabled: Boolean(session?.accessToken)
  });

  if (isLoading) {
    return <LoadingState label="Loading analysis history..." />;
  }

  return (
    <Card>
      <CardHeader className="font-display text-3xl text-white">History</CardHeader>
      <CardContent className="space-y-3">
        {data?.items.map((item: PublicAnalysis) => (
          <Link key={item.id} href={`/report/${item.id}${item.shareToken ? `?token=${item.shareToken}` : ""}`}>
            <div className="border border-border p-4 transition hover:border-accent">
              <div className="mb-2 font-display text-lg text-white">{item.input.slice(0, 90)}</div>
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                {item.status} • {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
