import Link from "next/link";

const links = [
  { href: "/dashboard", label: "New Analysis" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" }
];

export function Sidebar() {
  return (
    <aside className="panel h-fit min-w-[220px]">
      <div className="border-b border-border px-5 py-4 font-display text-sm uppercase tracking-[0.22em] text-zinc-100">
        Control Room
      </div>
      <nav className="flex flex-col p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border border-transparent px-3 py-3 font-mono text-sm text-zinc-300 transition hover:border-border hover:bg-zinc-950 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

