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

interface DebugInfo {
  blob_configured: boolean;
  on_vercel: boolean;
  local_path: string;
  store_exists: boolean;
  show_count: number;
  geocache_count: number;
  updated_at: string | null;
  is_stale: boolean;
  recent_runs: Run[];
  read_error: string | null;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RefreshResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("catz.adminToken") ?? "");
  }, []);

  const auth = token
    ? { Authorization: `Bearer ${token}` }
    : ({} as Record<string, string>);

  async function loadDebug() {
    try {
      const res = await fetch("/api/debug");
      if (res.ok) setDebug(await res.json());
    } catch {
      // debug is best-effort
    }
  }

  async function loadRuns() {
    try {
      const res = await fetch("/api/admin/refresh", { headers: auth });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setErr(`HTTP ${res.status}: ${body}`);
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
    loadDebug();
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
      const body = await res.text();
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${body}`);
        return;
      }
      const data = JSON.parse(body);
      if (data.error) {
        setErr(`Server error: ${data.error}`);
        return;
      }
      setLast(data.results);
      await loadDebug();
      await loadRuns();
    } catch (e) {
      setErr(
        `Network error: ${String(e)}\n\nThe function may have timed out or crashed. Check /api/debug for current state.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      {debug && (
        <section className="rounded border border-zinc-200 dark:border-zinc-800 p-3 text-sm space-y-1">
          <div className="font-semibold mb-1">Store status</div>
          {debug.read_error && (
            <div className="text-rose-600">Read error: {debug.read_error}</div>
          )}
          {!debug.blob_configured && debug.on_vercel && (
            <div className="text-amber-600">
              ⚠ BLOB_READ_WRITE_TOKEN not set — using /tmp (ephemeral, resets on cold start)
            </div>
          )}
          <div>
            {debug.store_exists ? (
              <>
                <span className="text-green-600">●</span>{" "}
                <strong>{debug.show_count}</strong> shows,{" "}
                <strong>{debug.geocache_count}</strong> geocache entries
                {debug.updated_at && (
                  <> · last updated {new Date(debug.updated_at).toLocaleString()}</>
                )}
                {debug.is_stale && (
                  <span className="text-amber-600"> (stale)</span>
                )}
              </>
            ) : (
              <span className="text-zinc-500">No data yet — click Refresh to populate</span>
            )}
          </div>
          <div className="text-zinc-400 text-xs">
            {debug.on_vercel ? "Vercel" : "local"} ·{" "}
            {debug.blob_configured ? "Blob storage" : `file: ${debug.local_path}`}
            {" · "}
            <a href="/api/debug" target="_blank" className="underline">
              /api/debug
            </a>
          </div>
        </section>
      )}

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

      <section className="space-y-2">
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 font-semibold disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh now"}
        </button>
        {busy && (
          <p className="text-sm text-zinc-500">
            Fetching FIFe + TICA and geocoding new shows via Nominatim (1 req/s). First run takes 1–2 minutes — please wait.
          </p>
        )}
        {err && (
          <pre className="text-rose-600 text-sm mt-2 whitespace-pre-wrap rounded bg-rose-50 dark:bg-rose-950 p-2">
            {err}
          </pre>
        )}
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
        {runs.length === 0 ? (
          <p className="text-sm text-zinc-500">No runs recorded yet.</p>
        ) : (
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
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
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
        )}
      </section>
    </main>
  );
}
