import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full border border-border bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-accent",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

