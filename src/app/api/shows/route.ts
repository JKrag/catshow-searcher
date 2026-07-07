import { NextRequest, NextResponse } from "next/server";
import { getOrLoadStore, isStale } from "@/lib/store";
import { listShows, distinctCountries } from "@/lib/shows-repo";
import { resolveFromFilter } from "@/lib/api-filter";
import type { Org, ShowFilter } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: ShowFilter = {};

  const org = sp.getAll("org");
  if (org.length) {
    filter.org = org.filter((o): o is Org => o === "FIFe" || o === "TICA");
  }
  const country = sp.getAll("country");
  if (country.length) filter.country = country;

  // Resolve the effective `from` date:
  //  - explicit `from` param wins unconditionally
  //  - `include_past=1` (no explicit from) → no floor (show all historical shows)
  //  - default → today (UTC YYYY-MM-DD), so only ongoing or future shows appear.
  // listShows compares end_date >= from, so a show in progress (started before today,
  // ends today-or-later) is NOT hidden by the default.
  const resolvedFrom = resolveFromFilter(sp);
  if (resolvedFrom) filter.from = resolvedFrom;

  const to = sp.get("to");
  if (to) filter.to = to;

  const q = sp.get("q");
  if (q) filter.q = q;

  const nearLat = sp.get("near_lat");
  const nearLng = sp.get("near_lng");
  const nearRadius = sp.get("near_radius_km");
  if (nearLat && nearLng && nearRadius) {
    filter.near = {
      lat: Number(nearLat),
      lng: Number(nearLng),
      radius_km: Number(nearRadius),
    };
  }

  const store = await getOrLoadStore();
  const shows = listShows(store, filter);
  const countries = distinctCountries(store);
  return NextResponse.json({
    shows,
    countries,
    stale: isStale(store),
    updated_at: store.updated_at,
  });
}
