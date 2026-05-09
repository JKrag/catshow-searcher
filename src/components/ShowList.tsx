"use client";

import type { Show, ShowWithDistance } from "@/lib/types";
import { OrgBadge } from "./OrgBadge";

interface Props {
  shows: ShowWithDistance[];
  homeSet: boolean;
}

function formatDates(s: Show): string {
  if (s.start_date === s.end_date) return s.start_date;
  return `${s.start_date} → ${s.end_date}`;
}

export function ShowList({ shows, homeSet }: Props) {
  if (shows.length === 0) {
    return (
      <div className="rounded-2xl bg-card/80 ring-1 ring-border p-10 text-center shadow-sm">
        <div className="text-3xl mb-2">🐾</div>
        <div className="font-medium text-foreground">No shows match the filters.</div>
        <div className="text-muted-foreground text-sm mt-1">
          Try clearing a filter or expanding the date range.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-card/80 ring-1 ring-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto thin-scroll">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-[var(--muted-soft)]/60 border-b border-border">
            <tr>
              <th className="py-2.5 px-4 w-16">Org</th>
              <th className="py-2.5 px-3 w-44">Dates</th>
              <th className="py-2.5 px-3">Title / Club</th>
              <th className="py-2.5 px-3">Location</th>
              {homeSet && <th className="py-2.5 px-3 w-32">Distance</th>}
              <th className="py-2.5 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {shows.map((s) => (
              <tr
                key={`${s.source}-${s.source_id}`}
                className="hover:bg-[var(--muted-soft)]/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <OrgBadge org={s.source} />
                </td>
                <td className="py-3 px-3 whitespace-nowrap font-mono text-[12.5px] text-foreground/80">
                  {formatDates(s)}
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium text-foreground">
                    {s.title}
                  </div>
                  {s.club && s.club !== s.title && (
                    <div className="text-xs text-muted-foreground mt-0.5">{s.club}</div>
                  )}
                  {s.source === "FIFe" && s.show_type && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{s.show_type}</div>
                  )}
                  {s.source === "TICA" && s.show_format && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{s.show_format}</div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="text-foreground/90">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </div>
                  {s.venue && s.venue !== `${s.city}, ${s.country}` && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                      {s.venue}
                    </div>
                  )}
                </td>
                {homeSet && (
                  <td className="py-3 px-3 whitespace-nowrap">
                    {s.distance_km != null ? (
                      <div className="inline-flex flex-col items-start gap-0.5 px-2 py-1 rounded-lg bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/30 distance-pulse">
                        <div className="font-semibold tabular-nums text-foreground text-xs">
                          {Math.round(s.distance_km)} km
                        </div>
                        {s.duration_min != null && (
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {formatDuration(s.duration_min)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open source page"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                      >
                        ↗
                      </a>
                    )}
                    {s.source === "FIFe" && s.website_url && (
                      <a
                        href={s.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Club website"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-[var(--fife)] hover:bg-[var(--fife)]/10 transition text-[10px] font-semibold"
                      >
                        🌐
                      </a>
                    )}
                    {s.source === "TICA" && s.flyer_url && (
                      <a
                        href={s.flyer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Flyer / club website"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-[var(--tica)] hover:bg-[var(--tica)]/10 transition text-[10px] font-semibold"
                      >
                        📄
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
