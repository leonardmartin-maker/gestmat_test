import type { EventOut } from "@/lib/api/events";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function EventsMiniTimeline({ events }: { events: EventOut[] }) {
  // 7 jours glissants (incluant aujourd’hui)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const counts = new Map<string, number>();
  for (const ev of events) {
    const d = new Date(ev.occurred_at);
    const key = ymd(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series = days.map((d) => ({ key: ymd(d), label: d.toLocaleDateString(undefined, { weekday: "short" }), n: counts.get(ymd(d)) ?? 0 }));
  const max = Math.max(1, ...series.map((x) => x.n));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Activité (7 jours)</div>

      <div className="flex items-end gap-2">
        {series.map((x) => (
          <div key={x.key} className="flex flex-col items-center gap-1">
            <div className="text-[10px] text-muted-foreground">{x.n}</div>
            <div
              className="w-6 rounded-md bg-muted"
              style={{ height: `${Math.max(6, Math.round((x.n / max) * 64))}px` }}
              title={`${x.key}: ${x.n} événement(s)`}
            />
            <div className="text-[10px] text-muted-foreground">{x.label}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Basé sur les événements récupérés côté client.
      </div>
    </div>
  );
}