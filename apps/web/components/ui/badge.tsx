import { cn } from "@/lib/utils";

export function Badge({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-200",
        className
      )}
    >
      {children}
    </span>
  );
}

