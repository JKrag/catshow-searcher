import { NextRequest, NextResponse } from "next/server";
import { getOrLoadStore } from "@/lib/store";
import { deriveStoreStats } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): Response | null {
  const requiredToken = process.env.CATZ_ADMIN_TOKEN;
  if (!requiredToken) {
    // No token configured — dev mode, allow all requests
    return null;
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== requiredToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const store = await getOrLoadStore();
  const stats = deriveStoreStats(store);
  return NextResponse.json(stats);
}
