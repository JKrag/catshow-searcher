"use client";

import { useMemo, useState } from "react";
import { FilterSidebar, defaultFilters, type Filters } from "@/components/FilterSidebar";
import { HomeAddressInput } from "@/components/HomeAddressInput";
import { ShowList } from "@/components/ShowList";
import { ShowCalendar } from "@/components/ShowCalendar";
import { ShowMap } from "@/components/ShowMap";
import { useHome } from "@/components/home";
import { useShows } from "@/hooks/useShows";
import { useRoutes } from "@/hooks/useRoutes";
import { haversineKm } from "@/lib/haversine";
import type { ShowWithDistance } from "@/lib/types";

type View = "list" | "calendar" | "map";

export default function ExhibitorPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [view, setView] = useState<View>("list");
  const [home] = useHome();

  const { shows, countries, loading } = useShows(filters);
  const routes = useRoutes(shows, home);

  // TODO(prefill-country): when home is set on first load and the user has
  // no countries selected, prefill `filters.countries` from
  // `homeCountryAliases(home.display_name)` (see src/components/home.ts).

  const annotated: ShowWithDistance[] = useMemo(() => {
    return shows.map((s) => {
      const r = routes[s.id];
      let distance_km: number | null = null;
      let duration_min: number | null = null;
      if (r) {
        distance_km = r.distance_km;
        duration_min = r.duration_min;
      } else if (home && s.lat != null && s.lng != null) {
        distance_km = haversineKm(home.lat, home.lng, s.lat, s.lng);
      }
      return { ...s, distance_km, duration_min };
    });
  }, [shows, routes, home]);

  const visible = useMemo(() => {
    let result = annotated;
    if (home && filters.maxDistanceKm) {
      result = result.filter(
        (s) => s.distance_km != null && s.distance_km <= filters.maxDistanceKm!,
      );
    }
    if (filters.judgeQ) {
      const q = filters.judgeQ.toLowerCase();
      result = result.filter((s) => {
        if (s.source !== "TICA") return false;
        // Pass through shows where judge data isn't fetched yet; exclude those with confirmed judges that don't match
        if (!s.judges) return true;
        return s.judges.some((j) => j.toLowerCase().includes(q));
      });
    }
    return result;
  }, [annotated, filters.maxDistanceKm, filters.judgeQ, home]);

  const sorted = useMemo(() => {
    if (!home || !filters.maxDistanceKm) {
      return [...visible].sort((a, b) => a.start_date.localeCompare(b.start_date));
    }
    return [...visible].sort(
      (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
    );
  }, [visible, home, filters.maxDistanceKm]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--background)]/75 border-b border-border/70">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] flex items-center justify-center text-lg shadow-sm ring-1 ring-black/5">
              🐈
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight leading-none text-foreground">
                catz
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1">
                FIFe + TICA cat shows in one place
              </p>
            </div>
          </div>
          <HomeAddressInput />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          countries={countries}
          homeSet={!!home}
        />

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div
              role="tablist"
              aria-label="View mode"
              className="inline-flex gap-1 rounded-xl bg-[var(--muted-soft)] p-1 ring-1 ring-border"
            >
              {(["list", "calendar", "map"] as View[]).map((v) => {
                const icon = v === "list" ? "☰" : v === "calendar" ? "▦" : "◉";
                return (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-sm rounded-lg capitalize font-medium transition-all flex items-center gap-1.5 ${
                      view === v
                        ? "bg-[var(--surface)] text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden className="text-xs opacity-70">
                      {icon}
                    </span>
                    {v}
                  </button>
                );
              })}
            </div>
            <div
              className={`text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ${
                !loading && visible.length === 0 && annotated.length > 0
                  ? "bg-amber-100 dark:bg-amber-950/40 ring-amber-300/70 dark:ring-amber-700/50 text-amber-800 dark:text-amber-300"
                  : "bg-[var(--muted-soft)] ring-border text-muted-foreground"
              }`}
              aria-live="polite"
            >
              {loading ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                  Loading…
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{visible.length}</span>
                  {" of "}
                  <span className="font-semibold text-foreground">{annotated.length}</span>{" "}
                  show{annotated.length === 1 ? "" : "s"}
                </>
              )}
            </div>
          </div>

          {view === "list" && <ShowList shows={sorted} homeSet={!!home} total={annotated.length} />}
          {view === "calendar" && <ShowCalendar shows={sorted} />}
          {view === "map" && (
            <ShowMap
              shows={sorted}
              home={home ? { lat: home.lat, lng: home.lng } : null}
              maxDistanceKm={filters.maxDistanceKm}
            />
          )}
        </section>
      </main>

      <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground text-center">
        Data:{" "}
        <a
          className="underline-offset-2 hover:underline hover:text-[var(--fife)]"
          href="https://fifeweb.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          FIFe
        </a>{" "}
        ·{" "}
        <a
          className="underline-offset-2 hover:underline hover:text-[var(--tica)]"
          href="https://shows.tica.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          TICA
        </a>{" "}
        · Map © OpenStreetMap · Routing via OSRM ·{" "}
        <a href="/admin" className="underline-offset-2 hover:underline">
          admin
        </a>
      </footer>
    </div>
  );
}
