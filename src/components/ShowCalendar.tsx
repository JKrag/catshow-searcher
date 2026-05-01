"use client";

import { useMemo, useState } from "react";
import type { Show } from "@/lib/types";
import { OrgBadge } from "./OrgBadge";

interface Props {
  shows: Show[];
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  // Start from Monday of the week containing the 1st
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ShowCalendar({ shows }: Props) {
  const initial = useMemo(() => {
    if (shows.length === 0) return startOfMonth(new Date());
    return startOfMonth(new Date(shows[0].start_date));
  }, [shows]);
  const [anchor, setAnchor] = useState(initial);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);

  const showsByDay = useMemo(() => {
    const map = new Map<string, Show[]>();
    for (const s of shows) {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        const arr = map.get(key) ?? [];
        arr.push(s);
        map.set(key, arr);
      }
    }
    return map;
  }, [shows]);

  const monthLabel = anchor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setAnchor(addMonths(anchor, -1))}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <button
          onClick={() => setAnchor(addMonths(anchor, 1))}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500 px-2 py-1"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const dayShows = showsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`bg-white dark:bg-zinc-950 min-h-24 p-1 ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <div className="text-xs text-zinc-500">{d.getDate()}</div>
              <div className="space-y-0.5 mt-1">
                {dayShows.slice(0, 3).map((s) => (
                  <a
                    key={`${s.source}-${s.source_id}`}
                    href={s.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[11px] leading-tight px-1 rounded hover:underline"
                    title={`${s.title} — ${s.city ?? ""}, ${s.country ?? ""}`}
                    style={{
                      backgroundColor:
                        s.source === "FIFe" ? "#dbeafe" : "#ffe4e6",
                      color: s.source === "FIFe" ? "#1e3a8a" : "#881337",
                    }}
                  >
                    {s.title}
                  </a>
                ))}
                {dayShows.length > 3 && (
                  <div className="text-[10px] text-zinc-500 px-1">
                    +{dayShows.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
        <OrgBadge org="FIFe" /> <span>FIFe</span>
        <OrgBadge org="TICA" /> <span>TICA</span>
      </div>
    </div>
  );
}
