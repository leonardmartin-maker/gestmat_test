import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "AVAILABLE"
      ? "border-transparent bg-green-600 text-white"
      : status === "ASSIGNED"
      ? "border-transparent bg-blue-600 text-white"
      : status === "MAINTENANCE"
      ? "border-transparent bg-amber-600 text-white"
      : status === "RETIRED"
      ? "border-transparent bg-zinc-600 text-white"
      : "";

  return <Badge className={cn(cls)}>{status}</Badge>;
}