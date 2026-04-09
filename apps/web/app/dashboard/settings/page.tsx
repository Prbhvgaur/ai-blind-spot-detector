"use client";

import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: me } = useSubscription(session?.accessToken);

  return (
    <div className="space-y-6">
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
