export type Org = "FIFe" | "TICA";

export interface Show {
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

export interface NormalisedShow {
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

export interface ShowFilter {
  org?: Org[];
  country?: string[];
  from?: string;
  to?: string;
  q?: string;
  near?: { lat: number; lng: number; radius_km: number };
}

export interface ShowWithDistance extends Show {
  distance_km?: number | null;
  duration_min?: number | null;
}
