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
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Home:</span>
          <span
            className="truncate max-w-xs"
            title={home.display_name}
          >
            {home.display_name}
          </span>
          <button
            type="button"
            onClick={() => setHome(null)}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
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
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm w-64"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1 text-sm disabled:opacity-50"
          >
            {busy ? "…" : "Set"}
          </button>
        </form>
      )}
      {err && <div className="text-rose-600 text-xs">{err}</div>}
    </div>
  );
}
