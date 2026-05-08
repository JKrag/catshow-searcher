import { NextRequest, NextResponse } from "next/server";
import { listShows, distinctCountries } from "@/lib/shows-repo";
import type { Org, ShowFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: ShowFilter = {};

  const org = sp.getAll("org");
  if (org.length) {
    filter.org = org.filter((o): o is Org => o === "FIFe" || o === "TICA");
  }
  const country = sp.getAll("country");
  if (country.length) filter.country = country;

  const from = sp.get("from");
  if (from) filter.from = from;
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

  const shows = await listShows(filter);
  const countries = await distinctCountries();
  return NextResponse.json({ shows, countries });
}
