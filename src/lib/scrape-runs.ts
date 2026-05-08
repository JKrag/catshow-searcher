import { getSql, ensureMigrated } from "./db";

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

export async function startRun(source: string): Promise<number> {
  await ensureMigrated();
  const rows = await getSql()`
    INSERT INTO scrape_runs (source) VALUES (${source})
    RETURNING id
  `;
  return Number(rows[0].id);
}

export async function finishRun(
  id: number,
  status: "ok" | "error",
  data: { items_seen?: number; items_changed?: number; error?: string } = {},
): Promise<void> {
  await getSql()`
    UPDATE scrape_runs
    SET finished_at  = NOW(),
        status       = ${status},
        items_seen   = COALESCE(${data.items_seen ?? null}, items_seen),
        items_changed = COALESCE(${data.items_changed ?? null}, items_changed),
        error        = ${data.error ?? null}
    WHERE id = ${id}
  `;
}

export async function recentRuns(limit = 20): Promise<ScrapeRun[]> {
  await ensureMigrated();
  return getSql()`
    SELECT * FROM scrape_runs
    ORDER BY started_at DESC
    LIMIT ${limit}
  ` as Promise<ScrapeRun[]>;
}
