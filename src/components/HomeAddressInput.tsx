"use client";

import { useState } from "react";
import { useHome } from "./home";

export function HomeAddressInput() {
  const [home, setHome] = useHome();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (!res.ok || !data.result) {
        setErr("Address not found.");
        return;
      }
      setHome({
        query: input,
        lat: data.result.lat,
        lng: data.result.lng,
        display_name: data.result.display_name,
      });
      setInput("");
    } catch {
      setErr("Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {home ? (
        <div className="flex items-center gap-2 text-sm rounded-full bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40 pl-3 pr-1.5 py-1">
          <span aria-hidden>🏠</span>
          <span
            className="truncate max-w-xs text-foreground"
            title={home.display_name}
          >
            {home.display_name}
          </span>
          <button
            type="button"
            onClick={() => setHome(null)}
            className="text-[11px] text-foreground/80 hover:bg-[var(--accent)]/25 rounded-full px-2 py-0.5 transition"
          >
            change
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Home address or postcode"
            className="rounded-lg border border-border bg-[var(--surface)] px-3 py-1.5 text-sm w-64 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] px-4 py-1.5 text-sm font-medium disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition"
          >
            {busy ? "…" : "Set"}
          </button>
        </form>
      )}
      {err && <div className="text-[var(--tica)] text-xs">{err}</div>}
    </div>
  );
}
