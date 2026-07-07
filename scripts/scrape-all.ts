// Full scrape pipeline: calendar scrape → detail fetch → geocode → persist.
// This is what the scheduled GitHub Actions job runs (see docs/adr/0001).
//
// Writes to the Vercel blob when BLOB_READ_WRITE_TOKEN is set, otherwise to
// .data/catz.json. A full run on a cold store takes 10–20 minutes (external
// calls are rate-limited to ~1 req/sec); use the budget flags for a quick
// local smoke run:
//
//   npm run scrape:all -- --geocode-budget 5 --detail-budget 3

import { runAllScrapers } from "../src/lib/scrapers/run.ts";
import { readStore } from "../src/lib/store.ts";

function budgetArg(name: string): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return Infinity;
  const value = Number(process.argv[i + 1]);
  if (!Number.isFinite(value) || value < 0) {
    console.error(`--${name} requires a non-negative number`);
    process.exit(1);
  }
  return value;
}

const geocodeBudget = budgetArg("geocode-budget");
const detailBudget = budgetArg("detail-budget");

const target = process.env.BLOB_READ_WRITE_TOKEN ? "Vercel blob" : ".data/catz.json";
console.log(`Running full scrape pipeline → ${target}`);
const t0 = Date.now();

const outcomes = await runAllScrapers(geocodeBudget, detailBudget);

for (const o of outcomes) {
  if (o.ok) {
    console.log(`${o.source}: +${o.inserted} inserted, ~${o.updated} updated, ${o.geocoded} geocoded`);
  } else {
    console.error(`${o.source}: FAILED — ${o.error}`);
  }
}

const store = await readStore();
if (store) {
  const byOrg = (org: string) => store.shows.filter((s) => s.source === org);
  for (const org of ["FIFe", "TICA"] as const) {
    const shows = byOrg(org);
    const detailed = shows.filter((s) => s.detail_fetched).length;
    const geocoded = shows.filter((s) => s.lat != null).length;
    console.log(`${org}: ${shows.length} shows | detail ${detailed}/${shows.length} | geocoded ${geocoded}/${shows.length}`);
  }
  console.log(`updated_at: ${store.updated_at}`);
}

console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (outcomes.some((o) => !o.ok)) process.exit(1);
