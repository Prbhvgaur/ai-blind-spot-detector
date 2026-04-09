"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function Accordion({
  items
}: {
  items: { title: string; content: React.ReactNode }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.title} className="border border-border bg-zinc-950/70">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-4 py-4 text-left font-display text-base text-zinc-100"
            >
              <span>{item.title}</span>
              <span className="font-mono text-accent">{isOpen ? "−" : "+"}</span>
            </button>
            <div className={cn("overflow-hidden px-4 pb-4", !isOpen && "hidden")}>{item.content}</div>
          </div>
        );
      })}
    </div>
  );
}

