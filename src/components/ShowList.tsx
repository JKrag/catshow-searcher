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
      <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 ring-1 ring-zinc-200 dark:ring-zinc-800 p-10 text-center">
        <div className="text-3xl mb-2">🐾</div>
        <div className="font-medium">No shows match the filters.</div>
        <div className="text-zinc-500 text-sm mt-1">
          Try clearing a filter or expanding the date range.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto thin-scroll">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-2.5 px-4 w-16">Org</th>
              <th className="py-2.5 px-3 w-44">Dates</th>
              <th className="py-2.5 px-3">Title / Club</th>
              <th className="py-2.5 px-3">Location</th>
              {homeSet && <th className="py-2.5 px-3 w-32">Distance</th>}
              <th className="py-2.5 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {shows.map((s) => (
              <tr
                key={`${s.source}-${s.source_id}`}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <td className="py-3 px-4">
                  <OrgBadge org={s.source} />
                </td>
                <td className="py-3 px-3 whitespace-nowrap font-mono text-[12.5px] text-zinc-700 dark:text-zinc-300">
                  {formatDates(s)}
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {s.title}
                  </div>
                  {s.club && s.club !== s.title && (
                    <div className="text-xs text-zinc-500 mt-0.5">{s.club}</div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="text-zinc-800 dark:text-zinc-200">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </div>
                  {s.venue && s.venue !== `${s.city}, ${s.country}` && (
                    <div className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">
                      {s.venue}
                    </div>
                  )}
                </td>
                {homeSet && (
                  <td className="py-3 px-3 whitespace-nowrap">
                    {s.distance_km != null ? (
                      <div>
                        <div className="font-medium tabular-nums">
                          {Math.round(s.distance_km)} km
                        </div>
                        {s.duration_min != null && (
                          <div className="text-xs text-zinc-500 tabular-nums">
                            {formatDuration(s.duration_min)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open source page"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                    >
                      ↗
                    </a>
                  )}
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
