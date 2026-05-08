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
    <div className="rounded-2xl bg-card/80 ring-1 ring-border shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setAnchor(addMonths(anchor, -1))}
          className="rounded-lg ring-1 ring-border hover:bg-[var(--muted-soft)] px-3 py-1.5 text-sm transition"
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAnchor(startOfMonth(new Date()))}
            className="rounded-lg ring-1 ring-border hover:bg-[var(--muted-soft)] px-3 py-1.5 text-xs transition"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor(addMonths(anchor, 1))}
            className="rounded-lg ring-1 ring-border hover:bg-[var(--muted-soft)] px-3 py-1.5 text-sm transition"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border ring-1 ring-border rounded-xl overflow-hidden">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-[var(--muted-soft)] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5 text-center"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = key === ymd(new Date());
          const dayShows = showsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`bg-[var(--surface)] min-h-[7rem] p-1.5 transition ${
                inMonth ? "" : "bg-[var(--muted-soft)]/50 opacity-60"
              }`}
            >
              <div
                className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? "bg-[var(--primary)] text-[var(--primary-fg)]" : "text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-0.5 mt-1">
                {dayShows.slice(0, 3).map((s) => (
                  <a
                    key={`${s.source}-${s.source_id}`}
                    href={s.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[11px] leading-tight px-1.5 py-0.5 rounded hover:opacity-80 transition border-l-2"
                    title={`${s.title} — ${s.city ?? ""}, ${s.country ?? ""}`}
                    style={{
                      backgroundColor:
                        s.source === "FIFe"
                          ? "var(--fife-soft)"
                          : "var(--tica-soft)",
                      color:
                        s.source === "FIFe"
                          ? "var(--fife-fg)"
                          : "var(--tica-fg)",
                      borderLeftColor:
                        s.source === "FIFe" ? "var(--fife)" : "var(--tica)",
                    }}
                  >
                    {s.title}
                  </a>
                ))}
                {dayShows.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayShows.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <OrgBadge org="FIFe" /> <span>FIFe</span>
        <OrgBadge org="TICA" /> <span>TICA</span>
      </div>
    </div>
  );
}
