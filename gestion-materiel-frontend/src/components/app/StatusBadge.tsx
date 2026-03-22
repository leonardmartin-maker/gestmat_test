import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircleCheck, UserCheck, Wrench, Archive, Flame, ShieldAlert } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CircleCheck }> = {
  AVAILABLE: {
    label: "Disponible",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    icon: CircleCheck,
  },
  ASSIGNED: {
    label: "Attribué",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    icon: UserCheck,
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    icon: Wrench,
  },
  RETIRED: {
    label: "Retiré",
    className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
    icon: Archive,
  },
  DESTROYED: {
    label: "Détruit",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    icon: Flame,
  },
  STOLEN: {
    label: "Volé",
    className: "bg-red-900 text-white border-red-900 hover:bg-red-900",
    icon: ShieldAlert,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return <Badge variant="secondary">{status}</Badge>;

  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
