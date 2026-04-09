"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-black/30 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl tracking-[0.18em] text-white">
          AI BLIND SPOT DETECTOR
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm uppercase tracking-[0.18em] text-zinc-300">
            Pricing
          </Link>
          {session ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Start Free</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

