import { auth } from "@/lib/auth";
import { BlindSpotReport } from "@/components/analysis/BlindSpotReport";

async function getAnalysis(id: string, accessToken?: string, token?: string) {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/analyses/${id}${token ? `?shareToken=${token}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function ReportPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const session = await auth();
  const analysis = await getAnalysis(params.id, session?.accessToken, searchParams.token);

  if (!analysis?.result) {
    return (
      <div className="border border-border bg-zinc-950/70 p-8 font-mono text-sm text-zinc-300">
        This report is unavailable. Make sure the share link is valid.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="font-display text-4xl text-white">Blind Spot Report</div>
        <p className="max-w-3xl font-mono text-sm text-zinc-400">{analysis.input}</p>
      </div>
      <BlindSpotReport analysis={analysis} />
    </div>
  );
}
