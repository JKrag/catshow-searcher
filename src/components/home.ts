"use client";

import { useEffect, useState } from "react";

export interface HomeAddress {
  query: string;
  lat: number;
  lng: number;
  display_name: string;
}

const KEY = "catz.home";

export function loadHome(): HomeAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HomeAddress;
  } catch {
    return null;
  }
}

export function saveHome(h: HomeAddress | null) {
  if (typeof window === "undefined") return;
  if (h) window.localStorage.setItem(KEY, JSON.stringify(h));
  else window.localStorage.removeItem(KEY);
}

export function useHome(): [
  HomeAddress | null,
  (h: HomeAddress | null) => void,
  boolean,
] {
  const [home, setHomeState] = useState<HomeAddress | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeState(loadHome());
    setReady(true);
  }, []);
  const setHome = (h: HomeAddress | null) => {
    saveHome(h);
    setHomeState(h);
  };
  return [home, setHome, ready];
}

// Country names in the shows DB are inconsistent (English + native).
// When prefilling the country filter from a home address, expand to a list
// of plausible aliases so we match shows regardless of how each scraper
// recorded the country.
const COUNTRY_ALIASES: Record<string, string[]> = {
  Denmark: ["Denmark", "Danmark"],
  Germany: ["Germany", "Deutschland"],
  Austria: ["Austria", "Österreich"],
  Sweden: ["Sweden", "Sverige"],
  Belgium: ["Belgium", "Belgique", "België"],
  Switzerland: ["Switzerland", "Suisse", "Schweiz", "Svizzera"],
  Italy: ["Italy", "Italia"],
  Spain: ["Spain", "España"],
  Netherlands: ["Netherlands", "Nederland"],
  Mexico: ["Mexico", "México"],
  Brazil: ["Brazil", "Brasil"],
  Panama: ["Panama", "Panamá"],
  "Czech Republic": ["Czech Republic", "Czechia", "Česko"],
  "United States": ["United States", "USA", "United States of America"],
  "United Kingdom": ["United Kingdom", "UK", "Great Britain"],
};

/**
 * Extract a country (and known native-name aliases) from a Nominatim
 * `display_name`. The country is the last comma-separated segment.
 * Returns an empty array if nothing usable can be derived.
 */
export function homeCountryAliases(displayName: string): string[] {
  const parts = displayName
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return [];
  const last = parts[parts.length - 1];
  const direct = COUNTRY_ALIASES[last];
  if (direct) return direct;
  for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.includes(last))
      return [canonical, ...aliases.filter((a) => a !== canonical)];
  }
  return [last];
}

