"use client";

import { useMemo } from "react";
import type { EventOut } from "@/lib/api/events";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDayLabel(d: Date) {
  return d.toLocaleDateString("fr-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function EventsHeatmap7d({
  events,
  days = 7,
}: {
  events: EventOut[];
  days?: number;
}) {
  const data = useMemo(() => {
    const now = new Date();
    const start = startOfDay(new Date());
    start.setDate(start.getDate() - (days - 1));

    const buckets: { date: Date; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = startOfDay(start);
      d.setDate(d.getDate() + i);
      buckets.push({ date: d, count: 0 });
    }

    for (const ev of events) {
      const t = new Date(ev.occurred_at);
      const d = startOfDay(t).getTime();
      const idx = Math.round((d - start.getTime()) / (24 * 3600 * 1000));
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    }

    const max = Math.max(1, ...buckets.map((b) => b.count));
    const total = buckets.reduce((s, b) => s + b.count, 0);

    return { buckets, max, total, now, start };
  }, [events, days]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">Activité (7 jours)</div>
        <div className="text-xs text-muted-foreground">{data.total} événement(s)</div>
      </div>

      <div className="flex items-end gap-2">
        {data.buckets.map((b, i) => {
          const h = Math.round((b.count / data.max) * 72); // 0..72px
          const title = `${fmtDayLabel(b.date)} — ${b.count} événement(s)`;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                title={title}
                className="w-6 rounded-md border bg-muted/50 hover:bg-muted transition"
                style={{ height: `${Math.max(6, h)}px` }}
              />
              <div className="text-[10px] text-muted-foreground">{b.date.toLocaleDateString("fr-CH", { weekday: "narrow" })}</div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        Astuce: survole une barre pour voir le détail du jour.
      </div>
    </div>
  );
}