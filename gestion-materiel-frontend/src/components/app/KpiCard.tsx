import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
      <CardContent className="p-4 flex items-center gap-4">
        {Icon && (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: (color || "#6C5CE7") + "15" }}
          >
            <Icon className="h-5 w-5" style={{ color: color || "#6C5CE7" }} />
          </div>
        )}
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
