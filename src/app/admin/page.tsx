"use client";

import { useEffect, useState } from "react";

interface Run {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_seen: number;
  items_changed: number;
  error: string | null;
}

interface RefreshResult {
  source: string;
  ok: boolean;
  inserted: number;
  updated: number;
  geocoded: number;
  error?: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RefreshResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(localStorage.getItem("catz.adminToken") ?? "");
  }, []);

  const auth = token
    ? { Authorization: `Bearer ${token}` }
    : ({} as Record<string, string>);

  async function loadRuns() {
    try {
      const res = await fetch("/api/admin/refresh", { headers: auth });
      if (!res.ok) {
        setErr(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setRuns(data.runs);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        headers: auth,
      });
      if (!res.ok) {
        setErr(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setLast(data.results);
      await loadRuns();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <section className="space-y-2">
        <label className="block text-sm font-semibold">Admin token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            localStorage.setItem("catz.adminToken", e.target.value);
          }}
          placeholder="(leave blank in dev)"
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
        />
      </section>

      <section>
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh now"}
        </button>
        {err && <div className="text-rose-600 text-sm mt-2">{err}</div>}
      </section>

      {last && (
        <section>
          <h2 className="font-semibold mb-2">Last run</h2>
          <ul className="text-sm space-y-1">
            {last.map((r) => (
              <li key={r.source}>
                <strong>{r.source}</strong>:{" "}
                {r.ok
                  ? `+${r.inserted} new, ${r.updated} updated, ${r.geocoded} geocoded`
                  : `error — ${r.error}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Recent runs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-1">Source</th>
              <th className="py-1">Started</th>
              <th className="py-1">Status</th>
              <th className="py-1">Seen</th>
              <th className="py-1">Changed</th>
              <th className="py-1">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1">{r.source}</td>
                <td className="py-1">{r.started_at}</td>
                <td className="py-1">{r.status}</td>
                <td className="py-1">{r.items_seen}</td>
                <td className="py-1">{r.items_changed}</td>
                <td className="py-1 text-rose-600">{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
