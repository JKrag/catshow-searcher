# Scraping runs in GitHub Actions, not in the Vercel app

The full scrape pipeline (calendar pagination + per-show detail fetch + Nominatim
geocoding, all rate-limited to ~1 req/s) takes 10–20 minutes on a cold store —
far beyond any Vercel function lifetime, even with `waitUntil`. In production this
silently killed every background refresh: the blob was never updated after the
initial seed. We decided that a scheduled GitHub Actions workflow owns the scrape:
it runs the scrapers as a Node script and writes the result to the Vercel blob
with a token. The Next.js app is read-only against the blob.

## Considered options

- **Vercel Cron + chunked work** — platform-native, but requires a chunking state
  machine to fit 300 s slices, and Hobby-plan crons are once-daily with short
  durations. Rejected: complexity without benefit.
- **Request-triggered stale-while-revalidate (status quo)** — rejected: the work
  cannot fit any request lifecycle, and freshness would depend on traffic.

## Consequences

- The detail-fetch budget caps (30/run per org) existed to fit the request
  lifecycle; in Actions they can be raised or removed.
- The in-app `waitUntil` refresh path in `getOrLoadStore` should be deleted, and
  the admin "Refresh now" flow must either dispatch the workflow or be dev-only.
