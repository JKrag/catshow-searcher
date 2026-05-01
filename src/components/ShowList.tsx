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
    return <div className="text-zinc-500 p-4">No shows match the filters.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="py-2 pr-3 w-16">Org</th>
            <th className="py-2 pr-3 w-44">Dates</th>
            <th className="py-2 pr-3">Title / Club</th>
            <th className="py-2 pr-3">Location</th>
            {homeSet && <th className="py-2 pr-3 w-32">Distance</th>}
            <th className="py-2 pr-3 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {shows.map((s) => (
            <tr
              key={`${s.source}-${s.source_id}`}
              className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
              <td className="py-2 pr-3">
                <OrgBadge org={s.source} />
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDates(s)}</td>
              <td className="py-2 pr-3">
                <div className="font-medium">{s.title}</div>
                {s.club && s.club !== s.title && (
                  <div className="text-xs text-zinc-500">{s.club}</div>
                )}
              </td>
              <td className="py-2 pr-3">
                <div>{[s.city, s.country].filter(Boolean).join(", ")}</div>
                {s.venue && s.venue !== `${s.city}, ${s.country}` && (
                  <div className="text-xs text-zinc-500 truncate max-w-xs">
                    {s.venue}
                  </div>
                )}
              </td>
              {homeSet && (
                <td className="py-2 pr-3 whitespace-nowrap">
                  {s.distance_km != null ? (
                    <div>
                      <div>{Math.round(s.distance_km)} km</div>
                      {s.duration_min != null && (
                        <div className="text-xs text-zinc-500">
                          {formatDuration(s.duration_min)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              )}
              <td className="py-2 pr-3">
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
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
  );
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
