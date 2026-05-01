"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterSidebar, defaultFilters, type Filters } from "@/components/FilterSidebar";
import { HomeAddressInput } from "@/components/HomeAddressInput";
import { ShowList } from "@/components/ShowList";
import { ShowCalendar } from "@/components/ShowCalendar";
import { ShowMap } from "@/components/ShowMap";
import { useHome } from "@/components/home";
import type { Show, ShowWithDistance } from "@/lib/types";

type View = "list" | "calendar" | "map";

interface ApiResp {
  shows: Show[];
  countries: string[];
}

interface RoutesResp {
  routes: Record<number, { distance_m: number; duration_s: number } | null>;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [view, setView] = useState<View>("list");
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<Record<number, { distance_km: number; duration_min: number }>>({});
  const [home] = useHome();

  // TODO(prefill-country): when home is set on first load and the user has
  // no countries selected, prefill `filters.countries` from
  // `homeCountryAliases(home.display_name)` (see src/components/home.ts).
  // Use the `ready` flag from useHome() to wait for localStorage hydration.
  // Don't override an explicit user choice. See README "Country prefill UX".

  // Fetch shows whenever server-side filters change
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    filters.org.forEach((o) => params.append("org", o));
    filters.countries.forEach((c) => params.append("country", c));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.q) params.set("q", filters.q);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/shows?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<ApiResp>)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filters.org, filters.countries, filters.from, filters.to, filters.q]);

  // Fetch driving distances for visible shows when home is set
  useEffect(() => {
    if (!home || !data) return;
    const dests = data.shows
      .filter((s) => s.lat != null && s.lng != null)
      .filter((s) => routes[s.id] === undefined)
      .slice(0, 100) // soft cap per pass; OSRM demo is forgiving but be polite
      .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng! }));
    if (dests.length === 0) return;
    const controller = new AbortController();
    fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: { lat: home.lat, lng: home.lng },
        dests,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<RoutesResp>)
      .then((res) => {
        setRoutes((prev) => {
          const next = { ...prev };
          for (const d of dests) {
            const r = res.routes[d.id];
            if (r) {
              next[d.id] = {
                distance_km: r.distance_m / 1000,
                duration_min: r.duration_s / 60,
              };
            }
          }
          return next;
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      });
    return () => controller.abort();
  }, [home, data, routes]);

  const annotated: ShowWithDistance[] = useMemo(() => {
    if (!data) return [];
    return data.shows.map((s) => {
      const r = routes[s.id];
      let distance_km: number | null = null;
      let duration_min: number | null = null;
      if (r) {
        distance_km = r.distance_km;
        duration_min = r.duration_min;
      } else if (home && s.lat != null && s.lng != null) {
        // Fallback: straight-line until OSRM responds
        distance_km = haversineKm(home.lat, home.lng, s.lat, s.lng);
      }
      return { ...s, distance_km, duration_min };
    });
  }, [data, routes, home]);

  const visible = useMemo(() => {
    if (!filters.maxDistanceKm) return annotated;
    return annotated.filter(
      (s) => s.distance_km != null && s.distance_km <= filters.maxDistanceKm!,
    );
  }, [annotated, filters.maxDistanceKm]);

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
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-zinc-950/70 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-rose-500 flex items-center justify-center text-lg shadow-sm">
              🐈
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">
                catz
              </h1>
              <p className="text-[11px] text-zinc-500 mt-0.5">
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
          countries={data?.countries ?? []}
          homeSet={!!home}
        />

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div
              role="tablist"
              aria-label="View mode"
              className="inline-flex gap-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 p-1 ring-1 ring-zinc-200 dark:ring-zinc-800"
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
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
              className="text-xs text-zinc-500 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 ring-1 ring-zinc-200 dark:ring-zinc-800"
              aria-live="polite"
            >
              {loading ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Loading…
                </>
              ) : (
                <>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    {visible.length}
                  </span>{" "}
                  show{visible.length === 1 ? "" : "s"}
                </>
              )}
            </div>
          </div>

          {view === "list" && <ShowList shows={sorted} homeSet={!!home} />}
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

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 text-xs text-zinc-500 text-center">
        Data:{" "}
        <a
          className="underline-offset-2 hover:underline hover:text-blue-600"
          href="https://fifeweb.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          FIFe
        </a>{" "}
        ·{" "}
        <a
          className="underline-offset-2 hover:underline hover:text-rose-600"
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
