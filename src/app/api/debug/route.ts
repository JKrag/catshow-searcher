import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { readStore, isStale, LOCAL_PATH } from "@/lib/store";

export const dynamic = "force-dynamic";

function localGitInfo(): { sha: string; branch: string } {
  try {
    const gitDir = path.join(process.cwd(), ".git");
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    if (head.startsWith("ref: ")) {
      const ref = head.slice(5);
      const branch = ref.replace("refs/heads/", "");
      const shaPath = path.join(gitDir, ref);
      const sha = fs.existsSync(shaPath)
        ? fs.readFileSync(shaPath, "utf8").trim().slice(0, 12)
        : "unknown";
      return { sha, branch };
    }
    return { sha: head.slice(0, 12), branch: "detached" };
  } catch {
    return { sha: "unknown", branch: "unknown" };
  }
}

export async function GET() {
  const blobEnvKeys = Object.keys(process.env).filter((k) =>
    k.startsWith("BLOB"),
  );
  const blobConfigured = blobEnvKeys.some((k) =>
    k.startsWith("BLOB_READ_WRITE_TOKEN"),
  );
  const onVercel = !!process.env.VERCEL;

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12)
    ?? localGitInfo().sha;
  const gitBranch = process.env.VERCEL_GIT_COMMIT_REF
    ?? localGitInfo().branch;

  let store = null;
  let readError: string | null = null;
  try {
    store = await readStore();
  } catch (e) {
    readError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    commit_sha: commitSha,
    git_branch: gitBranch,
    blob_configured: blobConfigured,
    blob_env_keys: blobEnvKeys,
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
