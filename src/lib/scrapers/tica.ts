import { parse, type HTMLElement } from "node-html-parser";
import type { NormalisedShow } from "../types";

const TICA_URL = "https://shows.tica.org/en/component/toes/shows";

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseMonthHeading(text: string): { year: number; month: number } | null {
  const m = text.trim().toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (!month) return null;
  return { year: Number(m[2]), month };
}

function parseDateRange(text: string): { startDay: number; endDay: number } | null {
  // "02 - 03" or "30"
  const t = text.trim();
  const m = t.match(/(\d{1,2})\s*(?:[-–]\s*(\d{1,2}))?/);
  if (!m) return null;
  const startDay = Number(m[1]);
  const endDay = m[2] ? Number(m[2]) : startDay;
  return { startDay, endDay };
}

function parseAddress(addr: string): {
  city: string | null;
  country: string | null;
  full: string;
} {
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { city: null, country: null, full: addr };
  const country = parts[parts.length - 1];
  const city = parts[0];
  return { city, country, full: addr };
}

export function parseTica(html: string): NormalisedShow[] {
  const root = parse(html);
  const list = root.querySelector(".show-list");
  if (!list) return [];

  const shows: NormalisedShow[] = [];
  let currentMonth: { year: number; month: number } | null = null;

  for (const child of list.childNodes) {
    if (!(child instanceof Object) || !("tagName" in child)) continue;
    const el = child as unknown as HTMLElement;
    if (!el.classList) continue;

    if (el.classList.contains("month-heading")) {
      currentMonth = parseMonthHeading(el.text);
    } else if (el.classList.contains("show-entry")) {
      if (!currentMonth) continue;
      const dateEl = el.querySelector(".date");
      const addressEl = el.querySelector(".address");
      const clubEl = el.querySelector(".club-name");
      const idLink = el.querySelector("a[rel]");
      const sourceId = idLink?.getAttribute("rel");
      if (!dateEl || !sourceId) continue;
      const range = parseDateRange(dateEl.text);
      if (!range) continue;

      let endMonth = currentMonth.month;
      let endYear = currentMonth.year;
      if (range.endDay < range.startDay) {
        endMonth += 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
      }
      const start_date = `${currentMonth.year}-${pad(currentMonth.month)}-${pad(range.startDay)}`;
      const end_date = `${endYear}-${pad(endMonth)}-${pad(range.endDay)}`;

      const address = addressEl?.text.trim() ?? "";
      const club = clubEl?.text.trim() ?? null;
      const loc = parseAddress(address);

      const title = club ? `${club}` : `TICA show ${sourceId}`;

      shows.push({
        source: "TICA",
        source_id: sourceId,
        title,
        club,
        country: loc.country,
        city: loc.city,
        venue: loc.full || null,
        start_date,
        end_date,
        url: `https://shows.tica.org/en/component/toes/show?id=${sourceId}`,
        raw: { address, club, date: dateEl.text.trim() },
      });
    }
  }
  return shows;
}

export async function fetchTica(): Promise<NormalisedShow[]> {
  const res = await fetch(TICA_URL, {
    headers: { "User-Agent": "catz/0.1 (cat-show finder)" },
  });
  if (!res.ok) throw new Error(`TICA HTTP ${res.status}`);
  const html = await res.text();
  return parseTica(html);
}
