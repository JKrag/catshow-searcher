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
      .slice(0, 30) // cap requests per pass — hits OSRM gently
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
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">🐈 catz</h1>
          <p className="text-xs text-zinc-500">
            FIFe + TICA cat shows in one place
          </p>
        </div>
        <HomeAddressInput />
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 max-w-[1400px] w-full mx-auto">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          countries={data?.countries ?? []}
          homeSet={!!home}
        />

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1">
              {(["list", "calendar", "map"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-sm rounded-md capitalize ${
                    view === v
                      ? "bg-white dark:bg-zinc-700 shadow"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="text-xs text-zinc-500">
              {loading
                ? "Loading…"
                : `${visible.length} show${visible.length === 1 ? "" : "s"}`}
            </div>
          </div>

          {view === "list" && <ShowList shows={sorted} homeSet={!!home} />}
          {view === "calendar" && <ShowCalendar shows={sorted} />}
          {view === "map" && (
            <ShowMap
              shows={sorted}
              home={home ? { lat: home.lat, lng: home.lng } : null}
            />
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-500 text-center">
        Data: <a className="underline" href="https://fifeweb.org" target="_blank" rel="noopener noreferrer">FIFe</a> ·{" "}
        <a className="underline" href="https://shows.tica.org" target="_blank" rel="noopener noreferrer">TICA</a> ·
        Map © OpenStreetMap · Routing via OSRM ·{" "}
        <a href="/admin" className="underline">admin</a>
      </footer>
    </div>
  );
}
