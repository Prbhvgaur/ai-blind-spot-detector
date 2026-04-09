export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="border border-border bg-muted px-4 py-6 font-mono text-sm text-zinc-300">
      {label}
    </div>
  );
}

