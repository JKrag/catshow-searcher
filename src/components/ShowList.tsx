"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import type { Show, ShowWithDistance } from "@/lib/types";
import { OrgBadge } from "./OrgBadge";
import { displayTitle } from "@/lib/display-title";

interface Props {
  shows: ShowWithDistance[];
  homeSet: boolean;
  variant?: "visitor" | "full";
  total?: number;
  initialSort?: InitialSort;
}

export type InitialSort = {
  column?: SortColumn;
  direction?: SortDirection;
};

type SortColumn = "start_date" | "distance_km" | "title" | "location";
type SortDirection = "asc" | "desc";

function formatDates(s: Show): string {
  if (s.start_date === s.end_date) return s.start_date;
  return `${s.start_date} → ${s.end_date}`;
}

function formatLocation(s: Show): string {
  return [s.city, s.country].filter(Boolean).join(", ");
}

function defaultCompare(column: SortColumn, a: ShowWithDistance, b: ShowWithDistance): number {
  if (column === "location") {
    return formatLocation(a).localeCompare(formatLocation(b));
  }
  const va = a[column];
  const vb = b[column];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (typeof va === "string" && typeof vb === "string") {
    return va.localeCompare(vb);
  }
  return (va as number) - (vb as number);
}

function parseJudge(judge: string): { name: string; ring: string | null } {
  const m = judge.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { name: m[1], ring: m[2] } : { name: judge, ring: null };
}

function venueAddsInfo(venue: string, city: string | null, country: string | null): boolean {
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 0 && !/\d/.test(w)));
  const baseWords = words(`${city ?? ""} ${country ?? ""}`);
  for (const w of words(venue)) {
    if (!baseWords.has(w)) return true;
  }
  return false;
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onToggle,
  className = "",
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggle: (col: SortColumn) => void;
  className?: string;
}) {
  const active = sortColumn === column;
  return (
    <th
      className={`py-0 px-0 ${className}`}
      aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="w-full h-full py-2.5 px-3 text-left cursor-pointer select-none hover:bg-[var(--muted-soft)]/80 transition-colors ring-1 ring-inset rounded-md"
      >
        {label}
        {active && (
          <span className="inline-block ml-1 text-[10px] font-bold" aria-hidden>
            {sortDirection === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );
}

export function ShowList({ shows, homeSet, variant = "full", total, initialSort }: Props) {
  const initialColumn = initialSort?.column ?? "start_date";
  const initialDirection = initialSort?.direction ?? "asc";

  const [sortColumn, setSortColumn] = useState<SortColumn>(initialColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const sortedShows = useMemo(() => {
    const arr = [...shows];
    arr.sort((a, b) => {
      const cmp = defaultCompare(sortColumn, a, b);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [shows, sortColumn, sortDirection]);

  const toggleColumn = useCallback((col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  const visibleRows = sortedShows.length === 0 ? [] : sortedShows.map((s) => {
    const judges =
      variant === "full" && s.source === "TICA" && s.judges && s.judges.length > 0
        ? s.judges
        : null;
    return { s, judges };
  });

  if (sortedShows.length === 0) {
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
              <SortableHeader
                label="Dates"
                column="start_date"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggle={toggleColumn}
                className="w-44"
              />
              <SortableHeader
                label="Title / Club"
                column="title"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggle={toggleColumn}
              />
              <SortableHeader
                label="Location"
                column="location"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggle={toggleColumn}
              />
              {homeSet && (
                <SortableHeader
                  label="Distance"
                  column="distance_km"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onToggle={toggleColumn}
                  className="w-32"
                />
              )}
              <th className="py-2.5 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ s, judges }) => (
              <Fragment key={`${s.source}-${s.source_id}`}>
                <tr
                  className={`border-t border-border/60 first:border-t-0 transition-colors hover:bg-[var(--muted-soft)]/50 ${
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
                      {displayTitle(s)}
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
                      {formatLocation(s)}
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
