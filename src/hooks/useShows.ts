"use client";

import { useEffect, useRef, useState } from "react";
import type { Org, Show } from "@/lib/types";

interface ShowFilter {
  org: Org[];
  countries: string[];
  from: string;
  to: string;
  q: string;
  includePast?: boolean;
}

interface ApiResp {
  shows: Show[];
  countries: string[];
  stale?: boolean;
  updated_at?: string;
}

export function useShows(filters: ShowFilter) {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (retryTimer.current) clearTimeout(retryTimer.current);

    const params = new URLSearchParams();
    filters.org.forEach((o) => params.append("org", o));
    filters.countries.forEach((c) => params.append("country", c));
    if (filters.from) {
      // Explicit from-date wins; also send when includePast is true so API honours it
      params.set("from", filters.from);
    } else if (filters.includePast) {
      // No explicit from + include past → ask API to skip the today default
      params.set("include_past", "1");
    }
    // If neither, the API will default from=today (future shows only)
    if (filters.to) params.set("to", filters.to);
    if (filters.q) params.set("q", filters.q);
    const url = `/api/shows?${params.toString()}`;

    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then((r) => r.json() as Promise<ApiResp>)
      .then((resp) => {
        setData(resp);
        // If the store was stale when we fetched, a background scrape is running.
        // Re-fetch after 8s to pick up freshly-scraped judge/detail data.
        if (resp.stale) {
          retryTimer.current = setTimeout(() => {
            fetch(url)
              .then((r) => r.json() as Promise<ApiResp>)
              .then(setData)
              .catch(() => {});
          }, 8000);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [filters.org, filters.countries, filters.from, filters.to, filters.q, filters.includePast]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    shows: data?.shows ?? [],
    countries: data?.countries ?? [],
    stale: data?.stale,
    updatedAt: data?.updated_at,
    loading,
  };
}
