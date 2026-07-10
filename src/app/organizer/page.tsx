"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeAddressInput } from "@/components/HomeAddressInput";
import { DataFreshness } from "@/components/DataFreshness";
import { OrganizerScatter } from "@/components/OrganizerScatter";
import { OrganizerMap } from "@/components/OrganizerMap";
import { useHome } from "@/components/home";
import type { HomeAddress } from "@/components/home";
import { useShows } from "@/hooks/useShows";
import { useRoutes } from "@/hooks/useRoutes";
import { haversineKm } from "@/lib/haversine";
import {
  assessCandidate,
  type Candidate,
  type CandidateOrg,
  type ShowStatus,
} from "@/lib/organizer";
import type { Org } from "@/lib/types";

const STORAGE_KEY = "catz.organizer-candidate";

function isCandidateOrg(v: string | null): v is CandidateOrg {
  return v === "FIFe" || v === "TICA" || v === "other";
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Default candidate window: next calendar year's Sep 1 – Oct 15.
function defaultCandidate(): Candidate {
  const now = new Date();
  const year = now.getUTCFullYear() + 1;
  return {
    lat: 55.6761, // Copenhagen-ish
    lng: 12.5683,
    from: `${year}-09-01`,
    to: `${year}-10-15`,
    org: "FIFe",
  };
}

function readCandidateFromUrl(): Candidate | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lng = params.get("lng");
  const from = params.get("from");
  const to = params.get("to");
  const org = params.get("org");
  if (!lat || !lng || !from || !to || !isCandidateOrg(org)) return null;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
  return { lat: latNum, lng: lngNum, from, to, org };
}

function readCandidateFromStorage(): Candidate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number" &&
      typeof parsed?.from === "string" &&
      typeof parsed?.to === "string" &&
      isCandidateOrg(parsed?.org)
    ) {
      return parsed as Candidate;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCandidateToUrl(c: Candidate) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("lat", String(c.lat));
  params.set("lng", String(c.lng));
  params.set("from", c.from);
  params.set("to", c.to);
  params.set("org", c.org);
  window.history.replaceState(null, "", `?${params.toString()}`);
}

function writeCandidateToStorage(c: Candidate) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function useCandidate(): [Candidate, (c: Candidate) => void] {
  const [candidate, setCandidateState] = useState<Candidate>(defaultCandidate);

  useEffect(() => {
    const initial = readCandidateFromUrl() ?? readCandidateFromStorage();
    if (initial) setCandidateState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCandidate = (c: Candidate) => {
    setCandidateState(c);
    writeCandidateToUrl(c);
    writeCandidateToStorage(c);
  };

  return [candidate, setCandidate];
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_PILL_STYLES: Record<ShowStatus, string> = {
  hard: "bg-red-100 dark:bg-red-950/40 ring-red-300/70 dark:ring-red-700/50 text-red-800 dark:text-red-300",
  potential:
    "bg-amber-100 dark:bg-amber-950/40 ring-amber-300/70 dark:ring-amber-700/50 text-amber-800 dark:text-amber-300",
  permission:
    "bg-amber-100 dark:bg-amber-950/40 ring-amber-300/70 dark:ring-amber-700/50 text-amber-800 dark:text-amber-300",
  approximate:
    "bg-amber-100 dark:bg-amber-950/40 ring-amber-300/70 dark:ring-amber-700/50 text-amber-800 dark:text-amber-300",
  clear:
    "bg-emerald-100 dark:bg-emerald-950/40 ring-emerald-300/70 dark:ring-emerald-700/50 text-emerald-800 dark:text-emerald-300",
  competition: "bg-[var(--muted-soft)] ring-border text-muted-foreground",
};

const STATUS_LABEL: Record<ShowStatus, string> = {
  hard: "Hard conflict",
  potential: "Potential conflict",
  permission: "Needs permission",
  approximate: "Approximate location",
  clear: "Clear",
  competition: "Competition",
};

export default function OrganizerPage() {
  const [home, setHome] = useHome();
  const [candidate, setCandidate] = useCandidate();
  const [selectedWeekend, setSelectedWeekend] = useState<string | null>(null);

  const fetchFrom = useMemo(() => addDays(candidate.from, -7), [candidate.from]);
  const fetchTo = useMemo(() => addDays(candidate.to, 7), [candidate.to]);

  const filters = useMemo(
    () => ({
      org: ["FIFe", "TICA"] as Org[],
      countries: [] as string[],
      from: fetchFrom,
      to: fetchTo,
      q: "",
      includePast: false,
    }),
    [fetchFrom, fetchTo],
  );

  const { shows, stale, updatedAt } = useShows(filters);

  // Only FIFe candidates need OSRM verification, and only for shows that are
  // already a haversine-potential FIFe conflict — never batch-OSRM everything.
  const fifeCandidates = useMemo(() => {
    if (candidate.org !== "FIFe") return [];
    return shows.filter(
      (s) =>
        s.source === "FIFe" &&
        s.start_date <= candidate.to &&
        s.end_date >= candidate.from &&
        s.lat != null &&
        s.lng != null &&
        haversineKm(candidate.lat, candidate.lng, s.lat, s.lng) < 400,
    );
  }, [shows, candidate.org, candidate.from, candidate.to, candidate.lat, candidate.lng]);

  const candidateAsHome: HomeAddress = useMemo(
    () => ({
      query: "candidate",
      display_name: "Candidate pin",
      lat: candidate.lat,
      lng: candidate.lng,
    }),
    [candidate.lat, candidate.lng],
  );

  const routes = useRoutes(fifeCandidates, candidateAsHome);

  const roadKmByShowId = useMemo(() => {
    const map: Record<string, number | undefined> = {};
    for (const [id, r] of Object.entries(routes)) map[id] = r.distance_km;
    return map;
  }, [routes]);

  const assessments = useMemo(
    () => assessCandidate(candidate, shows, roadKmByShowId),
    [candidate, shows, roadKmByShowId],
  );

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.weekend === selectedWeekend) ?? null,
    [assessments, selectedWeekend],
  );

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
                Show planning for organizers
              </p>
            </div>
          </div>
          <HomeAddressInput home={home} setHome={setHome} />
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
        <section className="rounded-2xl ring-1 ring-border bg-[var(--surface)] p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
            <input
              type="date"
              value={candidate.from}
              onChange={(e) => setCandidate({ ...candidate, from: e.target.value })}
              className="rounded-lg border border-border px-2 py-1.5 text-sm bg-[var(--background)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
            <input
              type="date"
              value={candidate.to}
              onChange={(e) => setCandidate({ ...candidate, to: e.target.value })}
              className="rounded-lg border border-border px-2 py-1.5 text-sm bg-[var(--background)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Organising federation
            </label>
            <div
              role="tablist"
              aria-label="Organising federation"
              className="inline-flex gap-1 rounded-xl bg-[var(--muted-soft)] p-1 ring-1 ring-border"
            >
              {(["FIFe", "TICA", "other"] as CandidateOrg[]).map((org) => (
                <button
                  key={org}
                  role="tab"
                  aria-selected={candidate.org === org}
                  onClick={() => setCandidate({ ...candidate, org })}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    candidate.org === org
                      ? "bg-[var(--surface)] text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {org}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Pin: {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} — drag the flag on the map
            to move it
          </div>
          <div className="ml-auto">
            <DataFreshness updatedAt={updatedAt} stale={stale} />
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <OrganizerMap
            shows={shows}
            candidate={candidate}
            onCandidateMove={(lat, lng) => setCandidate({ ...candidate, lat, lng })}
            selectedWeekend={selectedWeekend}
            selectedWeekendAssessment={selectedAssessment}
          />
          <div className="rounded-2xl ring-1 ring-border bg-[var(--surface)] p-4">
            <OrganizerScatter
              assessments={assessments}
              candidate={candidate}
              selectedWeekend={selectedWeekend}
              onSelectWeekend={setSelectedWeekend}
            />
          </div>
        </div>

        {selectedAssessment && (
          <section className="rounded-2xl ring-1 ring-border bg-[var(--surface)] p-4">
            <h2 className="font-serif text-lg font-semibold mb-3">
              Weekend of {selectedAssessment.weekend}
            </h2>
            <div className="flex flex-col gap-2">
              {selectedAssessment.shows.map((a) => (
                <div
                  key={a.show.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl ring-1 ring-border px-3 py-2 text-sm"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_PILL_STYLES[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                  <span className="font-medium">{a.show.club ?? a.show.title}</span>
                  <span className="text-muted-foreground">
                    {[a.show.city, a.show.country].filter(Boolean).join(", ")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {roadKmByShowId[String(a.show.id)] != null
                      ? `${Math.round(roadKmByShowId[String(a.show.id)]!)} km road`
                      : a.distance_km != null
                        ? `${Math.round(a.distance_km)} km straight-line`
                        : "distance unknown"}
                  </span>
                  {a.show.url && (
                    <a
                      href={a.show.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:underline text-[var(--primary)]"
                    >
                      Details ↗
                    </a>
                  )}
                </div>
              ))}
              {selectedAssessment.beyondCapCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{selectedAssessment.beyondCapCount} more shows further than 1500 km away
                </p>
              )}
              {selectedAssessment.noLocationCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedAssessment.noLocationCount} show(s) this weekend have no known location
                </p>
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Note: TICA&apos;s same-region clause is not modelled here (no region data available).
          FIFe protection normally depends on postal code, which we don&apos;t parse yet — all
          plotted FIFe shows are treated as protected.
        </p>
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
