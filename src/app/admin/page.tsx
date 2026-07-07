"use client";

import { useEffect, useState, useCallback } from "react";
import type { ScrapeRun } from "@/lib/types";
import type { OrgStats } from "@/lib/admin-stats";

interface StatusData {
  updated_at: string;
  orgs: OrgStats[];
  scrape_runs: ScrapeRun[];
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function dataAge(updatedAt: string): string {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("catz.adminToken") ?? "");
  }, []);

  const authHeaders = useCallback(
    () =>
      token
        ? { Authorization: `Bearer ${token}` }
        : ({} as Record<string, string>),
    [token],
  );

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/status", {
        cache: "no-store",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setErr(`HTTP ${res.status}: ${body}`);
        return;
      }
      setStatus(await res.json());
    } catch (e) {
      setErr(`Network error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  // Reload whenever the token changes (including initial mount after localStorage read)
  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin — Status Dashboard</h1>

      {/* Token input */}
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

      {/* Reload button */}
      <section>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? "Loading…" : "Reload status"}
        </button>
      </section>

      {err && (
        <pre className="text-rose-600 text-sm whitespace-pre-wrap rounded bg-rose-50 dark:bg-rose-950 p-2">
          {err}
        </pre>
      )}

      {status && (
        <>
          {/* Data age */}
          <section className="rounded border border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
            <div className="font-semibold text-sm">Store last updated</div>
            <div className="text-2xl font-bold">{dataAge(status.updated_at)}</div>
            <div className="text-xs text-zinc-500">
              {new Date(status.updated_at).toLocaleString()}
            </div>
          </section>

          {/* Per-org coverage */}
          <section className="space-y-2">
            <h2 className="font-semibold">Coverage by organisation</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-1 pr-4">Org</th>
                  <th className="py-1 pr-4">Shows</th>
                  <th className="py-1 pr-4">Detail fetched</th>
                  <th className="py-1">Geocoded</th>
                </tr>
              </thead>
              <tbody>
                {status.orgs.map((org) => (
                  <tr
                    key={org.source}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4">
                      <span
                        className={
                          org.source === "FIFe"
                            ? "inline-block rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            : "inline-block rounded px-2 py-0.5 text-xs font-semibold bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200"
                        }
                      >
                        {org.source}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono">{org.show_count}</td>
                    <td className="py-2 pr-4">
                      {org.detail_fetched}/{org.show_count}{" "}
                      <span className="text-zinc-500">
                        ({pct(org.detail_fetched, org.show_count)})
                      </span>
                    </td>
                    <td className="py-2">
                      {org.geocoded}/{org.show_count}{" "}
                      <span className="text-zinc-500">
                        ({pct(org.geocoded, org.show_count)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* GitHub Actions link */}
          <section className="text-sm">
            <a
              href="https://github.com/JKrag/cat-tools/actions/workflows/scrape.yml"
              target="_blank"
              rel="noreferrer"
              className="underline text-blue-600 dark:text-blue-400"
            >
              View scrape workflow runs on GitHub Actions ↗
            </a>
          </section>

          {/* Scrape run history */}
          <section>
            <h2 className="font-semibold mb-2">
              Scrape run history ({status.scrape_runs.length})
            </h2>
            {status.scrape_runs.length === 0 ? (
              <p className="text-sm text-zinc-500">No runs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-1 pr-3">Source</th>
                      <th className="py-1 pr-3">Started</th>
                      <th className="py-1 pr-3">Status</th>
                      <th className="py-1 pr-3">Seen</th>
                      <th className="py-1 pr-3">Changed</th>
                      <th className="py-1">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.scrape_runs.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="py-1 pr-3">{r.source}</td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {new Date(r.started_at).toLocaleString()}
                        </td>
                        <td className="py-1 pr-3">
                          <span
                            className={
                              r.status === "ok"
                                ? "text-green-600"
                                : "text-rose-600"
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-1 pr-3 font-mono">{r.items_seen}</td>
                        <td className="py-1 pr-3 font-mono">{r.items_changed}</td>
                        <td className="py-1 text-rose-600 max-w-xs truncate">
                          {r.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
