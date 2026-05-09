import type { NormalisedFifeShow } from "../types";

const FIFE_ICAL =
  "https://fifeweb.org/events/list/?tribe_eventcategory%5B0%5D=8&ical=1";

interface VEvent {
  uid?: string;
  summary?: string;
  dtstart?: string;
  dtend?: string;
  url?: string;
  location?: string;
  organizer?: string;
}

function unescape(s: string): string {
  return s
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\n/gi, "\n")
    .replace(/\\\\/g, "\\");
}

function decodeOrganizer(raw: string): string | null {
  // ORGANIZER;CN="Some%20Name":MAILTO:foo@bar
  const m = raw.match(/CN=("([^"]*)"|([^:;]*))/);
  if (!m) return null;
  const v = m[2] ?? m[3] ?? "";
  try {
    return decodeURIComponent(v.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))));
  } catch {
    return v;
  }
}

function parseDate(dt: string): string {
  // VALUE=DATE: e.g. 20260502 => 2026-05-02
  if (/^\d{8}$/.test(dt)) {
    return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
  }
  // 20260502T130000Z (etc.)
  if (/^\d{8}T\d{6}Z?$/.test(dt)) {
    return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
  }
  return dt;
}

function parseLocation(loc: string): {
  city: string | null;
  country: string | null;
  full: string;
} {
  // e.g. "Asker 1390, Asker, 1390, Norway"
  const parts = loc.split(",").map((p) => p.trim());
  const country = parts.length ? parts[parts.length - 1] : null;
  // Often parts[1] is city
  const city = parts.length >= 2 ? parts[1] : null;
  return { city: city || null, country: country || null, full: loc };
}

export function parseICal(text: string): VEvent[] {
  // Unfold lines (RFC5545 line continuations start with space/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: VEvent[] = [];
  let cur: VEvent | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
    } else if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
    } else if (cur) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const keyPart = line.slice(0, colon);
      const value = line.slice(colon + 1);
      const key = keyPart.split(";")[0].toUpperCase();
      switch (key) {
        case "UID":
          cur.uid = value;
          break;
        case "SUMMARY":
          cur.summary = unescape(value);
          break;
        case "DTSTART":
          cur.dtstart = value;
          break;
        case "DTEND":
          cur.dtend = value;
          break;
        case "URL":
          cur.url = value;
          break;
        case "LOCATION":
          cur.location = unescape(value);
          break;
        case "ORGANIZER":
          cur.organizer = decodeOrganizer(line) ?? undefined;
          break;
      }
    }
  }
  return events;
}

export async function fetchFife(): Promise<NormalisedFifeShow[]> {
  const res = await fetch(FIFE_ICAL, {
    headers: { "User-Agent": "catz/0.1 (cat-show finder)" },
  });
  if (!res.ok) throw new Error(`FIFe HTTP ${res.status}`);
  const text = await res.text();
  const events = parseICal(text);
  const shows: NormalisedFifeShow[] = [];
  for (const e of events) {
    if (!e.uid || !e.dtstart || !e.summary) continue;
    const start = parseDate(e.dtstart);
    // FIFe uses exclusive DTEND for all-day events; subtract one day for inclusive end.
    const endRaw = e.dtend ? parseDate(e.dtend) : start;
    const end = subtractOneDay(endRaw, start);
    const loc = e.location ? parseLocation(e.location) : null;
    shows.push({
      source: "FIFe",
      source_id: e.uid,
      title: e.summary,
      club: e.organizer ?? null,
      country: loc?.country ?? null,
      city: loc?.city ?? null,
      venue: loc?.full ?? null,
      start_date: start,
      end_date: end,
      url: e.url ?? null,
      show_type: null,
      raw: e,
    });
  }
  return shows;
}

export interface FifeShowDetail {
  show_type: string | null;
  website_url: string | null;
}

export function parseFifeDetail(html: string): FifeShowDetail {
  const typeMatch = html.match(/Show type\s*<\/dt>\s*<dd class="tribe-meta-value">\s*([\s\S]*?)\s*<\/dd>/);
  const show_type = typeMatch ? typeMatch[1].trim() || null : null;

  const organizerMatch = html.match(/"organizer":\{[^}]*"url":"([^"]+)"/);
  const rawUrl = organizerMatch ? organizerMatch[1] : null;
  const website_url =
    rawUrl && rawUrl !== "" && !rawUrl.includes("fifeweb.org") ? rawUrl : null;

  return { show_type, website_url };
}

export async function fetchFifeDetail(eventUrl: string): Promise<FifeShowDetail> {
  const res = await fetch(eventUrl, {
    headers: { "User-Agent": "catz/0.1 (cat-show finder)" },
  });
  if (!res.ok) throw new Error(`FIFe detail HTTP ${res.status} for ${eventUrl}`);
  return parseFifeDetail(await res.text());
}

function subtractOneDay(end: string, fallback: string): string {
  // For all-day iCal events, DTEND is the day after the event ends.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return end;
  if (end === fallback) return end;
  const d = new Date(end + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const r = d.toISOString().slice(0, 10);
  return r >= fallback ? r : fallback;
}
