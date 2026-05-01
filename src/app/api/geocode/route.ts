import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  try {
    const result = await geocode(q);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
