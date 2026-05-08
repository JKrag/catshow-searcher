import postgres from "postgres";

let _sql: postgres.Sql | null = null;
let _migrated = false;

export function getSql(): postgres.Sql {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = postgres(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS shows (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('FIFe','TICA')),
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      club TEXT,
      country TEXT,
      city TEXT,
      venue TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      url TEXT,
      raw_json TEXT,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source, source_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_dates ON shows(start_date, end_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_source ON shows(source)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_country ON shows(country)`;

  await sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      query TEXT PRIMARY KEY,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      display_name TEXT,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS route_cache (
      origin_lat DOUBLE PRECISION NOT NULL,
      origin_lng DOUBLE PRECISION NOT NULL,
      dest_lat DOUBLE PRECISION NOT NULL,
      dest_lng DOUBLE PRECISION NOT NULL,
      distance_m DOUBLE PRECISION,
      duration_s DOUBLE PRECISION,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (origin_lat, origin_lng, dest_lat, dest_lng)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scrape_runs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      source TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'running',
      items_seen INTEGER DEFAULT 0,
      items_changed INTEGER DEFAULT 0,
      error TEXT
    )
  `;
  _migrated = true;
}
