export type Org = "FIFe" | "TICA";

interface BaseShow {
  id: number;
  source: Org;
  source_id: string;
  title: string;
  club: string | null;
  country: string | null;
  city: string | null;
  venue: string | null;
  start_date: string;
  end_date: string;
  lat: number | null;
  lng: number | null;
  url: string | null;
  scraped_at: string;
}

export interface FifeShow extends BaseShow {
  source: "FIFe";
  show_type: string | null;
  website_url: string | null;
  detail_fetched: boolean;
}

export interface TicaShow extends BaseShow {
  source: "TICA";
  show_format: string | null;
  flyer_url: string | null;
  judges: string[] | null;
  detail_fetched: boolean;
}

export type Show = FifeShow | TicaShow;

interface BaseNormalisedShow {
  source: Org;
  source_id: string;
  title: string;
  club?: string | null;
  country?: string | null;
  city?: string | null;
  venue?: string | null;
  start_date: string;
  end_date: string;
  url?: string | null;
  raw?: unknown;
}

export interface NormalisedFifeShow extends BaseNormalisedShow {
  source: "FIFe";
  show_type?: string | null;
}

export interface NormalisedTicaShow extends BaseNormalisedShow {
  source: "TICA";
  show_format?: string | null;
  flyer_url?: string | null;
}

export type NormalisedShow = NormalisedFifeShow | NormalisedTicaShow;

export interface ShowFilter {
  org?: Org[];
  country?: string[];
  from?: string;
  to?: string;
  q?: string;
  near?: { lat: number; lng: number; radius_km: number };
}

export type ShowWithDistance = Show & {
  distance_km?: number | null;
  duration_min?: number | null;
};

export interface ScrapeRun {
  id: string;
  source: Org;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error";
  items_seen: number;
  items_changed: number;
  error: string | null;
}
