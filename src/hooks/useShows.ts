"use client";

import { useEffect, useState } from "react";
import type { Org, Show } from "@/lib/types";

interface ShowFilter {
  org: Org[];
  countries: string[];
  from: string;
  to: string;
  q: string;
}

interface ApiResp {
  shows: Show[];
  countries: string[];
}

export function useShows(filters: ShowFilter) {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    filters.org.forEach((o) => params.append("org", o));
    filters.countries.forEach((c) => params.append("country", c));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.q) params.set("q", filters.q);
    setLoading(true);
    fetch(`/api/shows?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<ApiResp>)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filters.org, filters.countries, filters.from, filters.to, filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    shows: data?.shows ?? [],
    countries: data?.countries ?? [],
    loading,
  };
}
