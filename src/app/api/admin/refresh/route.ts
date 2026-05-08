import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers/run";
import { recentRuns } from "@/lib/scrape-runs";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function authorize(req: NextRequest): boolean {
  const required = process.env.CATZ_ADMIN_TOKEN;
  if (!required) return true;
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === required;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return unauthorized();
  const results = await runAllScrapers();
  return NextResponse.json({ results });
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return unauthorized();
  const store = await readStore();
  const runs = store ? recentRuns(store, 10) : [];
  return NextResponse.json({ runs });
}
