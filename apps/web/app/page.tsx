import Link from "next/link";
import { ShieldAlert, SplitSquareVertical, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Mia Patel",
    role: "SaaS Founder",
    quote:
      "It caught the assumption that our GTM was repeatable when it was really just founder network pull. That single report saved us a quarter."
  },
  {
    name: "Jonah Reeves",
    role: "Strategy Analyst",
    quote:
      "Most AI tools polish my thinking. This one pressure-tests it. The blind spot ranking is the part I now trust first."
  },
  {
    name: "Dr. Elena Morris",
    role: "Research Lead",
    quote:
      "The expert-persona objections feel like a hostile review panel in the best possible way."
  }
];

const steps = [
  {
    title: "Paste the idea",
    body: "Drop in a strategy memo, startup plan, important decision, or raw AI conversation.",
    icon: Target
  },
  {
    title: "Trigger the adversarial pipeline",
    body: "The system searches for assumptions, counterarguments, and objections your original assistant glossed over.",
    icon: SplitSquareVertical
  },
  {
    title: "Get the report",
    body: "Receive a ranked Blind Spot Report, confidence audit, expert disagreement, and action-ready pushback in under a minute.",
    icon: ShieldAlert
  }
];

export default function LandingPage() {
  return (
    <div className="space-y-24 pb-10">
      <section className="grid gap-10 border border-border bg-black/20 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
        <div className="space-y-6">
          <div className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
            Interrogation-grade reasoning
          </div>
          <h1 className="headline-glow max-w-4xl font-display text-5xl leading-tight text-white sm:text-6xl lg:text-7xl">
            Your AI is agreeing with you. That&apos;s the problem.
          </h1>
          <p className="max-w-2xl font-mono text-base leading-7 text-zinc-300">
            Blind Spot Detector runs every idea through an adversarial pipeline, finding the assumptions, counterarguments, and expert objections your AI never surfaced.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <Button size="lg">Interrogate Your First Idea - Free</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                See Pricing
              </Button>
            </Link>
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-zinc-950 px-5 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            Sample Report Snapshot
          </div>
          <CardContent className="space-y-4 p-5">
            <div className="border border-critical/40 bg-critical/10 p-4">
              <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-red-200/80">
                Critical blind spot
              </div>
              <p className="terminal-text">
                Your plan assumes the market wants more certainty. In practice, they may want faster decisions, even if they are messier.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-border p-4">
                <div className="mb-2 font-display text-lg text-white">42%</div>
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Defensible reasoning
                </div>
              </div>
              <div className="border border-border p-4">
                <div className="mb-2 font-display text-lg text-accent">Major rethink needed</div>
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Confidence audit verdict
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="font-display text-3xl text-white">Used by 2,400+ founders, analysts & strategists</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name}>
              <CardContent className="space-y-4 p-5">
                <p className="terminal-text">{testimonial.quote}</p>
                <div>
                  <div className="font-display text-lg text-white">{testimonial.name}</div>
                  <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                    {testimonial.role}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="font-display text-3xl text-white">How It Works</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-accent text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Step {index + 1}
                    </div>
                  </div>
                  <div className="font-display text-2xl text-white">{step.title}</div>
                  <p className="terminal-text">{step.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="font-display text-2xl text-white">Free</div>
            <div className="font-display text-4xl text-accent">$0</div>
            <ul className="space-y-3 terminal-text">
              <li>• 3 analyses</li>
              <li>• Basic blind spot report</li>
              <li>• Counterarguments and assumptions</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-accent/50">
          <CardContent className="space-y-4 p-6">
            <div className="font-display text-2xl text-white">Pro</div>
            <div className="font-display text-4xl text-accent">$15/mo</div>
            <ul className="space-y-3 terminal-text">
              <li>• Unlimited analyses</li>
              <li>• Full expert personas</li>
              <li>• Shareable reports</li>
              <li>• History and subscription tools</li>
            </ul>
            <Link href="/pricing">
              <Button className="w-full">See Full Pricing</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

