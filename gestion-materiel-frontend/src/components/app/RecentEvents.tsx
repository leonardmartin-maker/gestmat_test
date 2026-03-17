import type { EventOut } from "@/lib/api/events";

function fmt(dt: string) {
  return new Date(dt).toLocaleString();
}

export function RecentEvents({
  events,
  onOpenAsset,
}: {
  events: EventOut[];
  onOpenAsset?: (assetId: number) => void;
}) {
  if (!events.length) {
    return <div className="text-sm text-muted-foreground">Aucun événement récent</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Derniers événements</div>

      <div className="space-y-2">
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className="w-full text-left rounded-md border p-3 text-sm hover:bg-muted/50"
            onClick={() => onOpenAsset?.(ev.asset_id)}
            title="Ouvrir le matériel"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{ev.event_type}</div>
              <div className="text-xs text-muted-foreground">{fmt(ev.occurred_at)}</div>
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Asset #{ev.asset_id}
              {ev.employee_id ? ` • Employé #${ev.employee_id}` : ""}
              {ev.km_value != null ? ` • KM ${ev.km_value}` : ""}
            </div>

            {ev.notes && <div className="mt-2 text-xs text-muted-foreground">{ev.notes}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}