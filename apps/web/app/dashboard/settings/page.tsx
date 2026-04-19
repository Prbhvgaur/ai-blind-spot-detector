"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { api } from "@/lib/api";

function SettingsContent() {
  const { data: session } = useSession();
  const { data: me } = useSubscription(session?.accessToken);
  const searchParams = useSearchParams();
  const billingState = searchParams.get("billing");

  return (
    <div className="space-y-6">
      {billingState === "success" ? (
        <div className="border border-accent/60 bg-accent/10 px-4 py-4 font-mono text-sm text-amber-100">
          Billing completed successfully. Your account will refresh shortly.
        </div>
      ) : null}

      {billingState === "stripe-unavailable" ? (
        <div className="border border-border bg-zinc-950/70 px-4 py-4 font-mono text-sm text-zinc-200">
          Billing is temporarily unavailable in this deployment because live Stripe credentials are not configured yet.
        </div>
      ) : null}

      {billingState === "demo-checkout" || billingState === "demo-portal" ? (
        <div className="border border-border bg-zinc-950/70 px-4 py-4 font-mono text-sm text-zinc-200">
          Billing is running in demo mode for this environment.
        </div>
      ) : null}

      <Card>
        <CardHeader className="font-display text-3xl text-white">Settings</CardHeader>
        <CardContent className="space-y-4 terminal-text">
          <p>Email: {me?.email}</p>
          <p>Plan: {me?.plan}</p>
          <p>Analyses used: {me?.analysisCount}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={async () => {
            if (!session?.accessToken) return;
            const portal = await api.createPortalSession(session.accessToken);
            window.location.href = portal.url;
          }}
        >
          Manage Billing
        </Button>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
          Log Out
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="font-mono text-sm text-zinc-400">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
