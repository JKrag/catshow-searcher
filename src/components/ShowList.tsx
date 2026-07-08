"use client";

import { Fragment } from "react";
import type { Show, ShowWithDistance } from "@/lib/types";
import { OrgBadge } from "./OrgBadge";

interface Props {
  shows: ShowWithDistance[];
  homeSet: boolean;
  variant?: "visitor" | "full";
  total?: number;
}

function formatDates(s: Show): string {
  if (s.start_date === s.end_date) return s.start_date;
  return `${s.start_date} → ${s.end_date}`;
}

// Judges are stored as "Yukimasa Hattori(AB)" — split off the ring code so it
// can be rendered as a small badge instead of wrapping mid-name.
function parseJudge(judge: string): { name: string; ring: string | null } {
  const m = judge.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { name: m[1], ring: m[2] } : { name: judge, ring: null };
}

// Returns true if the venue string contains meaningful info beyond city + country.
// Strips numbers (postal codes) before comparing so "Birkerød 3460, Birkerød, 3460, Denmark"
// doesn't duplicate "Birkerød, Denmark", while "Sanford, Florida, United States" still
// shows the state.
function venueAddsInfo(venue: string, city: string | null, country: string | null): boolean {
  // Keep only tokens with no digits — drops postal codes like "3460", "CV8", "2LG"
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 0 && !/\d/.test(w)));
  const baseWords = words(`${city ?? ""} ${country ?? ""}`);
  for (const w of words(venue)) {
    if (!baseWords.has(w)) return true;
  }
  return false;
}

export function ShowList({ shows, homeSet, variant = "full", total }: Props) {
  if (shows.length === 0) {
    const hiddenByDistance = total != null && total > 0;
    return (
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300/60 dark:ring-amber-700/40 p-10 text-center shadow-sm">
        <div className="text-3xl mb-2">🔍</div>
        <div className="font-medium text-foreground">
          {hiddenByDistance
            ? `0 of ${total} shows match — filters are too narrow`
            : "No shows match the filters."}
        </div>
        <div className="text-muted-foreground text-sm mt-1">
          {hiddenByDistance
            ? 'Try increasing the distance limit, unchecking country filters, or use "Show all distances".'
            : "Try clearing a filter or expanding the date range."}
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
          <tbody>
            {shows.map((s) => {
              const judges =
                variant === "full" && s.source === "TICA" && s.judges && s.judges.length > 0
                  ? s.judges
                  : null;
              return (
              <Fragment key={`${s.source}-${s.source_id}`}>
              <tr
                className={`border-t border-border/60 first:border-t-0 transition-colors hover:bg-[var(--muted-soft)]/50 ${
                  // Keep the judges sub-row highlighted together with its main row
                  judges
                    ? "[&:hover+tr]:bg-[var(--muted-soft)]/50 [&:has(+tr:hover)]:bg-[var(--muted-soft)]/50"
                    : ""
                }`}
              >
                <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-4`}>
                  <OrgBadge org={s.source} />
                </td>
                <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-3 whitespace-nowrap font-mono text-[12.5px] text-foreground/80`}>
                  {formatDates(s)}
                </td>
                <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-3`}>
                  <div className="font-medium text-foreground">
                    {s.title}
                  </div>
                  {s.club && s.club !== s.title && (
                    <div className="text-xs text-muted-foreground mt-0.5">{s.club}</div>
                  )}
                  {variant === "full" && s.source === "FIFe" && s.show_type && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{s.show_type}</div>
                  )}
                  {variant === "full" && s.source === "TICA" && s.show_format && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{s.show_format}</div>
                  )}
                </td>
                <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-3`}>
                  <div className="text-foreground/90">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </div>
                  {s.venue && venueAddsInfo(s.venue, s.city, s.country) && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                      {s.venue}
                    </div>
                  )}
                </td>
                {homeSet && (
                  <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-3 whitespace-nowrap`}>
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
                <td className={`${judges ? "pb-1 pt-2.5" : "py-2.5"} px-4`}>
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
              {judges && (
                <tr className="transition-colors hover:bg-[var(--muted-soft)]/50">
                  <td colSpan={homeSet ? 6 : 5} className="pb-2.5 px-4 pt-0">
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
                        Judges
                      </span>
                      {judges.map((j, i) => {
                        const { name, ring } = parseJudge(j);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-[var(--muted-soft)]/70 ring-1 ring-border/60 px-1.5 py-0.5 text-[11px] leading-tight text-foreground/80"
                          >
                            {name}
                            {ring && (
                              <span className="text-[9px] font-semibold uppercase text-[var(--tica)]">
                                {ring}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
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
