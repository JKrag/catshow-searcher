"use client";

import { useEffect, useState } from "react";
import type { Show } from "@/lib/types";
import type { HomeAddress } from "@/components/home";

interface RoutesResp {
  routes: Record<number, { distance_m: number; duration_s: number } | null>;
}

export type RouteEntry = { distance_km: number; duration_min: number };

export function useRoutes(shows: Show[], home: HomeAddress | null) {
  const [routes, setRoutes] = useState<Record<number, RouteEntry>>({});

  useEffect(() => {
    if (!home || shows.length === 0) return;
    const dests = shows
      .filter((s) => s.lat != null && s.lng != null)
      .filter((s) => routes[s.id] === undefined)
      .slice(0, 100)
      .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng! }));
    if (dests.length === 0) return;
    const controller = new AbortController();
    fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ origin: { lat: home.lat, lng: home.lng }, dests }),
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
  }, [home, shows, routes]); // eslint-disable-line react-hooks/exhaustive-deps

  return routes;
}
