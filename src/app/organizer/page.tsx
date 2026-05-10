"use client";

import { HomeAddressInput } from "@/components/HomeAddressInput";

export default function OrganizerPage() {
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
          <HomeAddressInput />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="font-serif text-2xl font-semibold mb-2">Timeline view</h2>
          <p className="text-muted-foreground">
            Planning tools for show organizers — spacing rules, slot finder, and a
            multi-year timeline view — are coming soon.
          </p>
        </div>
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
