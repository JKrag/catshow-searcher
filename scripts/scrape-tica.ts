import { fetchTica } from "../src/lib/scrapers/tica.ts";

const t0 = Date.now();
console.log("Fetching TICA shows…");

const shows = await fetchTica();

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s — ${shows.length} shows`);

if (shows.length > 0) {
  const sorted = [...shows].sort((a, b) => a.start_date.localeCompare(b.start_date));
  console.log(`First: ${sorted[0].start_date}  ${sorted[0].title} — ${sorted[0].country}`);
  console.log(`Last:  ${sorted[sorted.length - 1].start_date}  ${sorted[sorted.length - 1].title} — ${sorted[sorted.length - 1].country}`);
}
