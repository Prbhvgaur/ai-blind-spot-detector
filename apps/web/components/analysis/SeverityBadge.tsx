import { Badge } from "@/components/ui/badge";

export function SeverityBadge({ severity }: { severity: "Critical" | "High" | "Medium" }) {
  const palette =
    severity === "Critical"
      ? "border-critical/50 bg-critical/10 text-red-200"
      : severity === "High"
        ? "border-high/50 bg-high/10 text-amber-100"
        : "border-medium/50 bg-medium/10 text-yellow-100";

  return <Badge className={palette}>{severity}</Badge>;
}

