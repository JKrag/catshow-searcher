# World knowledge — external systems

Compact reference for facts learned about external data sources by live inspection.
Update this file whenever you discover or correct something about how these systems work.

---

## FIFe — fifeweb.org

### Calendar iCal feed

**Canonical URL (page 1):** `https://fifeweb.org/events/category/all-shows/?ical=1`
**Paginated URL (page N≥2):** `https://fifeweb.org/events/category/all-shows/page/N/?ical=1`

Pagination notes:
- ~49 pages total today; ~30 events per page; feed extends to ~Oct 2035
- `tribe_paged=N` query param does **not** work — use path-based pagination only
- The old URL `…/events/list/?tribe_eventcategory%5B0%5D=8&ical=1` only returns page 1

Per-VEVENT fields present: `UID`, `SUMMARY`, `DTSTART`, `DTEND`, `URL`, `LOCATION`, `ORGANIZER`

- `DESCRIPTION` is always **empty** — show type is NOT in the iCal
- `DTEND` is exclusive (day-after for all-day events) — subtract one day for inclusive end date
- `SUMMARY` is always just `"International show"` — not the club/event name
- `ORGANIZER` is `CN="ClubName":MAILTO:...` — club name extractable via CN regex
- `LOCATION` format: `"Venue Name PostalCode\, City\, PostalCode\, Country"` — last part is country, second part is city
- `UID` format: `10001208-1778284800-1778371199@fifeweb.org` — use as stable `source_id`
- `CATEGORIES` only contains `"— International shows,All shows:"` for all events (filtered by URL)
- Line continuation: RFC 5545 folding (lines starting with space/tab must be unfolded)

### Per-event detail pages

**URL pattern:** value of `URL` field in iCal, e.g. `https://fifeweb.org/event/international-show-1238/`

Useful fields extractable by HTML/regex:

| Field | Location in HTML | Notes |
|---|---|---|
| `show_type` | `<dd class="tribe-meta-value">…</dd>` after `<dt> Show type </dt>` | e.g. "Two 1 day, 2 cert.", "One 1 day, 2 cert. Show" |
| `website_url` | JSON-LD `"organizer":{…,"url":"…"}` | Filter out empty strings and fifeweb.org URLs |

- No auth required; plain `GET` with a descriptive `User-Agent` header
- `show_type` examples seen: `"One 1 day, 2 cert. Show"`, `"Two 1 day, 2 cert."`
  (inconsistent trailing " Show" — store as-is, normalise only if needed for display)
- Some shows have no organizer website — JSON-LD `url` key will be absent or empty
- Rate limit: be polite, 1 req/sec is safe

---

## TICA — shows.tica.org

### Calendar page

**URL:** `https://shows.tica.org/en/component/toes/shows`

- Requires browser-like `User-Agent`; plain curl with short UA gets blocked
- Structure: `.month-heading` elements set month context; `.show-entry` elements are shows
- Each `.show-entry` contains: `.date` (day or range), `.address` (city, country), `.club-name`
- Show ID extracted from `<a rel="…">` — the `rel` attribute value is the numeric TICA show ID
- Direct link format: `https://shows.tica.org/en/component/toes/shows#show{id}`
- Date range spanning month boundary (e.g. "30 - 02"): endDay < startDay → increment month

**Season pagination via POST:**
- Each page covers one TICA season: May 1 of `season_year` through April 30 of `season_year + 1`
- Current season year is embedded as `<input type="hidden" id="season_year" … value="YYYY">`
- Fetch any season with `POST /en/component/toes/shows` body `season_year=YYYY`
- Works for current and future seasons; returns 0 `.show-entry` elements when season is empty
- "Next Season" / "Previous Season" links on the page call `filterSeason(year)` JS — not plain URLs

### Per-show detail endpoint

**URL pattern:** `GET https://shows.tica.org/index.php?option=com_toes&view=show&layout=short&id={id}&tmpl=component`

- **Redirects** from `/index.php?…` to `/en/?…` — must use `redirect: "follow"`
- Requires browser-like `User-Agent` AND `Referer: https://shows.tica.org/en/component/toes/shows`
  (returns 403 without proper headers)
- ~135 shows on the calendar at any given time

| Field | Extraction | Notes |
|---|---|---|
| `show_format` | regex: `/Show Format\s*<\/label>\s*<span>\s*([\s\S]*?)\s*<\/span>/` | e.g. "Alternative", "Championship" |
| `flyer_url` | regex: `/class="flyer"[\s\S]*?href="([^"]+)"/` | Filter `"http://"` and `"https://"` (empty-URL sentinel) |

- `flyer_url` is real and populated for European shows (Danish, Dutch, UK shows confirmed)
- Rate limit: 1 req/sec is safe

---

## Nominatim — geocoding

**URL:** `https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1`

- Free tier: **1 request per second** hard limit; exceeding gets 429
- Requires a descriptive `User-Agent` with contact info
- Results cached in `store.geocode_cache` (keyed by query string) to avoid repeat lookups
- Query strategy: try `venue` string first, fall back to `city + country`

---

## OSRM — routing

**URL:** `https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?overview=false`

- Free demo server; be polite (soft cap of 100 destinations per page load)
- Returns `routes[0].distance` (metres) and `routes[0].duration` (seconds)
- No auth required
