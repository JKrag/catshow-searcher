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

export function useHome(): [HomeAddress | null, (h: HomeAddress | null) => void] {
  const [home, setHomeState] = useState<HomeAddress | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeState(loadHome());
  }, []);
  const setHome = (h: HomeAddress | null) => {
    saveHome(h);
    setHomeState(h);
  };
  return [home, setHome];
}
