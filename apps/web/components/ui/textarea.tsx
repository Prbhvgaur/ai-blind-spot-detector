import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[200px] w-full resize-y border border-border bg-zinc-950 px-4 py-4 font-mono text-sm text-zinc-100 outline-none transition focus:border-accent",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

