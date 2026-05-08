import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  // Vercel's deployment directory is read-only at runtime; only /tmp is writable.
  // SQLite data in /tmp is ephemeral — migrate to Postgres for true persistence.
  const dbPath =
    process.env.CATZ_DB_PATH ??
    (process.env.VERCEL
      ? "/tmp/catz.sqlite"
      : path.join(process.cwd(), ".data", "catz.sqlite"));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK (source IN ('FIFe','TICA')),
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      club TEXT,
      country TEXT,
      city TEXT,
      venue TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      lat REAL,
      lng REAL,
      url TEXT,
      raw_json TEXT,
      scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source, source_id)
    );
    CREATE INDEX IF NOT EXISTS idx_shows_dates ON shows(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_shows_source ON shows(source);
    CREATE INDEX IF NOT EXISTS idx_shows_country ON shows(country);

    CREATE TABLE IF NOT EXISTS geocode_cache (
      query TEXT PRIMARY KEY,
      lat REAL,
      lng REAL,
      display_name TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS route_cache (
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      distance_m REAL,
      duration_s REAL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (origin_lat, origin_lng, dest_lat, dest_lng)
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      items_seen INTEGER DEFAULT 0,
      items_changed INTEGER DEFAULT 0,
      error TEXT
    );
  `);
}
