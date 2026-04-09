"use client";

import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function PricingPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3">
        <div className="font-display text-5xl text-white">Pricing</div>
        <p className="max-w-2xl font-mono text-sm text-zinc-400">
          Free gets you the first hard truths. Pro makes adversarial analysis part of your everyday workflow.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="font-display text-3xl text-white">Free</div>
            <div className="font-display text-5xl text-accent">$0</div>
            <ul className="space-y-3 terminal-text">
              <li>• 3 total analyses</li>
              <li>• Ranked blind spot report</li>
              <li>• Hidden assumptions</li>
              <li>• Confidence audit</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-accent/60">
          <CardContent className="space-y-5 p-6">
            <div className="font-display text-3xl text-white">Pro</div>
            <div className="font-display text-5xl text-accent">$15/mo</div>
            <ul className="space-y-3 terminal-text">
              <li>• Unlimited analyses</li>
              <li>• Full expert personas</li>
              <li>• Shareable reports</li>
              <li>• Analysis history</li>
            </ul>
            <Button
              className="w-full"
              onClick={async () => {
                if (!session?.accessToken) {
                  window.location.href = "/login";
                  return;
                }

                const checkout = await api.createCheckoutSession(session.accessToken);
                window.location.href = checkout.url;
              }}
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

