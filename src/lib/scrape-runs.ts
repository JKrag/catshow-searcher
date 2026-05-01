import { getDb } from "./db";

export interface ScrapeRun {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_seen: number;
  items_changed: number;
  error: string | null;
}

export function startRun(source: string): number {
  const r = getDb()
    .prepare("INSERT INTO scrape_runs (source) VALUES (?)")
    .run(source);
  return Number(r.lastInsertRowid);
}

export function finishRun(
  id: number,
  status: "ok" | "error",
  data: { items_seen?: number; items_changed?: number; error?: string } = {},
) {
  getDb()
    .prepare(
      `UPDATE scrape_runs
       SET finished_at = datetime('now'),
           status = ?,
           items_seen = COALESCE(?, items_seen),
           items_changed = COALESCE(?, items_changed),
           error = ?
       WHERE id = ?`,
    )
    .run(
      status,
      data.items_seen ?? null,
      data.items_changed ?? null,
      data.error ?? null,
      id,
    );
}

export function recentRuns(limit = 20): ScrapeRun[] {
  return getDb()
    .prepare(
      "SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT ?",
    )
    .all(limit) as ScrapeRun[];
}
