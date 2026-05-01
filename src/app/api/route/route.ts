import { NextRequest, NextResponse } from "next/server";
import { getRoute } from "@/lib/route";

export const dynamic = "force-dynamic";

interface Body {
  origin: { lat: number; lng: number };
  dests: { id: number; lat: number; lng: number }[];
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (
    !body?.origin ||
    typeof body.origin.lat !== "number" ||
    typeof body.origin.lng !== "number" ||
    !Array.isArray(body.dests)
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const out: Record<number, { distance_m: number; duration_s: number } | null> = {};
  for (const d of body.dests) {
    if (typeof d.lat !== "number" || typeof d.lng !== "number") {
      out[d.id] = null;
      continue;
    }
    try {
      out[d.id] = await getRoute(body.origin, { lat: d.lat, lng: d.lng });
    } catch {
      out[d.id] = null;
    }
  }
  return NextResponse.json({ routes: out });
}
