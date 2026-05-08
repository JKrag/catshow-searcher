import { NextResponse } from "next/server";
import { readStore, isStale, LOCAL_PATH } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
  const onVercel = !!process.env.VERCEL;

  let store = null;
  let readError: string | null = null;
  try {
    store = await readStore();
  } catch (e) {
    readError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    blob_configured: blobConfigured,
    on_vercel: onVercel,
    local_path: LOCAL_PATH,
    store_exists: store !== null,
    show_count: store?.shows.length ?? 0,
    geocache_count: Object.keys(store?.geocode_cache ?? {}).length,
    updated_at: store?.updated_at ?? null,
    is_stale: store ? isStale(store) : true,
    recent_runs: store?.scrape_runs.slice(0, 5) ?? [],
    read_error: readError,
  });
}
