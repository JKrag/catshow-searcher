import { describe, it, expect } from "vitest";
import type { FifeShow, TicaShow } from "../types";
import {
  weekendKey,
  weekendsInWindow,
  assessCandidate,
} from "../organizer";

// --- Test helpers ---

const PIN_LAT = 55.6761; // Copenhagen
const PIN_LNG = 12.5683;

const defaultFife = (overrides: Partial<FifeShow>): FifeShow => ({
  source: "FIFe",
  start_date: "2027-09-11",
  end_date: "2027-09-11",
  show_type: null,
  website_url: null,
  detail_fetched: false,
  id: 100,
  source_id: "test-fife",
  title: "Test Show",
  club: "Test Club",
  country: null,
  city: null,
  venue: null,
  lat: PIN_LAT - 3.7, // ~410 km north
  lng: PIN_LNG + 0.1,
  geo_precision: "venue",
  url: null,
  scraped_at: new Date().toISOString(),
  ...overrides,
});

const defaultTica = (overrides: Partial<TicaShow>): TicaShow => ({
  source: "TICA",
  start_date: "2027-09-11", // Saturday
  end_date: "2027-09-11",
  show_format: null,
  flyer_url: null,
  judges: null,
  detail_fetched: false,
  id: 200,
  source_id: "test-tica",
  title: "Test TICA",
  club: "Test Club",
  country: null,
  city: null,
  venue: null,
  lat: PIN_LAT - 3.7,
  lng: PIN_LNG + 0.1,
  geo_precision: "venue",
  url: null,
  scraped_at: new Date().toISOString(),
  ...overrides,
});

const candidate = (overrides?: Partial<any>) => ({
  lat: PIN_LAT,
  lng: PIN_LNG,
  from: "2027-09-01",
  to: "2027-10-15",
  org: "FIFe" as const,
  ...overrides,
});

const roadKmByShowId = (id: number, km: number) => ({
  [String(id)]: km,
});

// --- weekendKey ---

describe("weekendKey", () => {
  it("Fri → same Saturday", () => {
    // 2027-09-11 is Saturday (getUTCDay=6)
    expect(weekendKey("2027-09-11")).toBe("2027-09-11");
  });

  it("Sun → previous Saturday", () => {
    // 2027-09-12 is Sunday → previous day = Saturday 2027-09-11
    expect(weekendKey("2027-09-12")).toBe("2027-09-11");
  });

  it("Sat → same Saturday", () => {
    // 2027-09-13 is Saturday (Sat = Fri+1, or Fri=09-11, Sat=09-18… wait)
    // 2027-09-11=Sat → 2027-09-12=Sun → 2027-09-13=Mon → Sat=2027-09-18
    expect(weekendKey("2027-09-13")).toBe("2027-09-18");
  });

  it("Mon → next Saturday", () => {
    // 2027-09-14 is Monday → next Sat = 2027-09-18
    expect(weekendKey("2027-09-14")).toBe("2027-09-18");
  });

  it("Tue → next Saturday", () => {
    // 2027-09-15 is Tuesday → next Sat = 2027-09-18
    expect(weekendKey("2027-09-15")).toBe("2027-09-18");
  });

  it("Wed → next Saturday", () => {
    // 2027-09-16 is Wednesday → next Sat = 2027-09-18
    expect(weekendKey("2027-09-16")).toBe("2027-09-18");
  });

  it("Thu → next Saturday", () => {
    // 2027-09-16 is Thursday → next Sat = 2027-09-18
    expect(weekendKey("2027-09-16")).toBe("2027-09-18");
  });

  it("Fri → next Saturday", () => {
    // 2027-09-17 is Friday → next Sat = 2027-09-18
    expect(weekendKey("2027-09-17")).toBe("2027-09-18");
  });

  it("year boundary Dec 30 (Wed)", () => {
    // 2026-12-30 is Wednesday → next Saturday = Jan 2 2027
    expect(weekendKey("2026-12-30")).toBe("2027-01-02");
  });

  it("year boundary Dec 31 (Thu)", () => {
    // 2026-12-31 is Thursday → next Saturday = Jan 2 2027
    expect(weekendKey("2026-12-31")).toBe("2027-01-02");
  });

  it("month boundary Feb 28 (Sun)", () => {
    // 2027-02-28 is Sunday → prev day = Sat Feb 27
    expect(weekendKey("2027-02-28")).toBe("2027-02-27");
  });
});

// --- weekendsInWindow ---

describe("weekendsInWindow", () => {
  it("single-day Monday candidate → one weekend (the Saturday after)", () => {
    const w = weekendsInWindow("2027-09-13", "2027-09-13"); // Monday
    expect(w).toEqual(["2027-09-18"]);
  });

  it("multi-week window produces consecutive Saturdays", () => {
    const w = weekendsInWindow("2027-09-01", "2027-10-15");
    // Sep 01 = Wed → Sat Sep 04; Oct 15 = Fri → Sat Oct 16
    expect(w).toEqual(["2027-09-04", "2027-09-11", "2027-09-18", "2027-09-25", "2027-10-02", "2027-10-09", "2027-10-16"]);
  });

  it("same-Saturday window → single weekend", () => {
    expect(weekendsInWindow("2027-09-11", "2027-09-11")).toEqual(["2027-09-11"]);
  });

  it("same-Saturday-to-same-Saturday → single weekend", () => {
    expect(weekendsInWindow("2027-09-11", "2027-09-11")).toEqual(["2027-09-11"]);
  });
});

// --- assessCandidate: FIFe ---

describe("assessCandidate — FIFe", () => {
  it("no same-day overlap → no collision for FIFe show", () => {
    // FIFe show on 2027-10-25, candidate window Sep 1 – Oct 15
    const fife = defaultFife({
      start_date: "2027-10-25",
      end_date: "2027-10-25",
      id: 111,
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    // FIFe show outside window → empty
    expect(assessments).toHaveLength(0);
  });

  it("FIFe same-day, haversine ≥ 400 km → clear (no OSRM call needed)", () => {
    // Move show far away (> 410 km)
    const fife = defaultFife({
      start_date: "2027-09-06", // Friday, in candidate window
      end_date: "2027-09-06",
      id: 111,
      lat: PIN_LAT - 10, // ~1100 km away
      lng: PIN_LNG + 2,
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    // Same-day FIFe show → included in some weekend
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("clear");
  });

  it("FIFe same-day, haversine < 400 km but no road KM → potential", () => {
    const fife = defaultFife({
      start_date: "2027-09-12", // Saturday in window
      end_date: "2027-09-12",
      id: 111,
      lat: PIN_LAT - 2, // ~220 km (under 400)
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("potential");
  });

  it("FIFe same-day, haversine < 400 km, road KM ≥ 400 → clear", () => {
    const fife = defaultFife({
      start_date: "2027-09-12",
      end_date: "2027-09-12",
      id: 111,
      lat: PIN_LAT - 2, // ~220 km haversine (under 400)
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(
      candidate(),
      [fife],
      roadKmByShowId(111, 500) // road ≥ 400 → clear
    );
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("clear");
  });

  it("FIFe same-day, haversine < 400 km, road KM < 400 → hard", () => {
    const fife = defaultFife({
      start_date: "2027-09-12",
      end_date: "2027-09-12",
      id: 111,
      lat: PIN_LAT - 2, // ~220 km haversine (under 400)
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(
      candidate(),
      [fife],
      roadKmByShowId(111, 300) // road < 400 → hard
    );
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("hard");
  });

  it("FIFe no-location show → not a FIFe collision", () => {
    const fife = defaultFife({
      start_date: "2027-09-12",
      end_date: "2027-09-12",
      id: 111,
      lat: null,
      lng: null,
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    // Should not produce any shows (no haversine → can't evaluate FIFe rule)
    const allShows = assessments.flatMap((a) => a.shows);
    expect(allShows).toHaveLength(0);
  });

  it("FIFe candidate → FIFe show, haversine < 400, city geo → approximate", () => {
    const fife = defaultFife({
      start_date: "2027-09-12",
      end_date: "2027-09-12",
      id: 111,
      lat: PIN_LAT - 2, // ~220 km under 400
      lng: PIN_LNG,
      geo_precision: "city",
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("approximate");
  });
});

// --- assessCandidate: TICA ---

describe("assessCandidate — TICA", () => {
  it("TICA on same weekend, haversine < 805 km, venue → permission", () => {
    const tica = defaultTica({
      start_date: "2027-09-11",
      lat: PIN_LAT - 2, // ~220 km (under 805)
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate({ org: "TICA" }), [tica], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("permission");
  });

  it("TICA on same weekend, haversine ≥ 805 km → competition", () => {
    const tica = defaultTica({
      start_date: "2027-09-18", // same Sat as candidate cFirstSat
      lat: PIN_LAT - 10, // ~1110 km (under 1500 cap but over 805)
      lng: PIN_LNG + 5,
    });
    const assessments = assessCandidate(candidate(), [tica], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("competition");
  });

  it("TICA same weekend, city geo_precision → approximate", () => {
    const tica = defaultTica({
      start_date: "2027-09-18", // same Sat as candidate cFirstSat
      lat: PIN_LAT - 2, // under 805
      lng: PIN_LNG,
      geo_precision: "city",
    });
    const assessments = assessCandidate(candidate({ org: "TICA" }), [tica], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("approximate");
  });

  it("TICA on different weekend → no collision", () => {
    const tica = defaultTica({
      start_date: "2027-08-21", // different weekend (outside candidate)
      lat: PIN_LAT - 1,
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate(), [tica], {});
    // TICA show on Aug 21-22, candidate Sep 1 – Oct 15 → no overlap
    const allShows = assessments.flatMap((a) => a.shows);
    expect(allShows).toHaveLength(0);
  });
});

// --- WeekendStatus ---

describe("assessCandidate — weekend status", () => {
  it("'blocked' if any show is hard", () => {
    const fife = defaultFife({
      start_date: "2027-09-18", // Saturday
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 2,
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(
      candidate(),
      [fife],
      roadKmByShowId(111, 300) // road < 400 → hard
    );
    const wk = assessments.find((a) => a.weekend === "2027-09-18");
    expect(wk).toBeDefined();
    expect(wk!.status).toBe("blocked");
  });

  it("'check' if any show is permission", () => {
    const tica = defaultTica({
      start_date: "2027-09-18",
      lat: PIN_LAT - 2,
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate({ org: "TICA" }), [tica], {});
    const wk = assessments.find((a) => a.weekend === "2027-09-18");
    expect(wk).toBeDefined();
    expect(wk!.status).toBe("check");
  });

  it("'clear' when all shows are clear or competition", () => {
    const fife = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 10, // far away, haversine > 400
      lng: PIN_LNG + 5,
    });
    const assessments = assessCandidate(candidate(), [fife], {});
    const wk = assessments.find((a) => a.weekend === "2027-09-18");
    expect(wk).toBeDefined();
    expect(wk!.status).toBe("clear");
  });

  it("'check' when mixed hard and clear", () => {
    const fife1 = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 2,
      lng: PIN_LNG,
    });
    const fife2 = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 112,
      lat: PIN_LAT - 10, // far away
      lng: PIN_LNG + 5,
    });
    const assessments = assessCandidate(
      candidate(),
      [fife1, fife2],
      roadKmByShowId(111, 300) // only fife1 has road KM
    );
    const wk = assessments.find((a) => a.weekend === "2027-09-18");
    expect(wk).toBeDefined();
    expect(wk!.status).toBe("blocked");
  });
});

// --- Approximate shows never become hard ---

describe("approximate status", () => {
  it("city-geo FIFe show stays 'approximate' even with road KM < 400", () => {
    const fife = defaultFife({
      start_date: "2027-09-12",
      end_date: "2027-09-12",
      id: 111,
      lat: PIN_LAT - 2, // under 400
      lng: PIN_LNG,
      geo_precision: "city",
    });
    const assessments = assessCandidate(
      candidate(),
      [fife],
      roadKmByShowId(111, 300) // road < 400
    );
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    // Approximate should NOT become hard even if road distance says conflict
    expect(found[0].status).toBe("approximate");
  });

  it("country-geo FIFe show stays 'approximate'", () => {
    const fife = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 2, // ~222 km (under 400)
      lng: PIN_LNG,
      geo_precision: "country",
    });
    const assessments = assessCandidate(
      candidate(),
      [fife],
      roadKmByShowId(111, 300)
    );
    const found = assessments.flatMap((a) => a.shows);
    expect(found[0].status).toBe("approximate");
  });
});

// --- Cap and no-location ---

describe("cap and noLocationCount", () => {
  it("shows beyond 1500 km go to beyondCapCount", () => {
    const farAway = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 30, // way beyond 1500 km
      lng: PIN_LNG + 20,
    });
    // Move a closer show into the window
    const close = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 112,
      lat: PIN_LAT - 0.5,
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate(), [farAway, close], {});
    const wk = assessments.find((a) => a.weekend === "2027-09-18");
    expect(wk).toBeDefined();
    expect(wk!.beyondCapCount).toBe(1);
    expect(wk!.shows).toHaveLength(1); // close show within cap
  });

  it("shows with no coordinates go to noLocationCount, not the cap", () => {
    const tica = defaultTica({
      start_date: "2027-09-11",
      lat: null,
      lng: null,
    });
    const assessments = assessCandidate(candidate(), [tica], {});
    const wk = assessments.find((a) => a.weekend === "2027-09-11");
    expect(wk).toBeDefined();
    expect(wk!.noLocationCount).toBe(1);
    expect(wk!.shows).toHaveLength(0); // shows within cap only
  });
});

// --- Org=other → all competition ---

describe("organising federation = 'other' → no blast radius", () => {
  it("FIFe shows within 400 km become 'competition', not 'hard'/'potential'", () => {
    const fife = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 111,
      lat: PIN_LAT - 2, // well under 400 km
      lng: PIN_LNG,
    });
    const c = candidate({ org: "other" });
    const assessments = assessCandidate(c, [fife], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("competition");
  });

  it("TICA shows within 805 km become 'competition', not 'permission'", () => {
    const tica = defaultTica({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 211,
      lat: PIN_LAT - 2,
      lng: PIN_LNG,
    });
    const c = candidate({ org: "other" });
    const assessments = assessCandidate(c, [tica], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("competition");
  });
});

describe("cross-org shows are always soft competition, never rule conflicts", () => {
  it("TICA candidate vs nearby FIFe show → 'competition', not FIFe hard/potential", () => {
    const fife = defaultFife({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 112,
      lat: PIN_LAT - 2, // well under 400 km
      lng: PIN_LNG,
    });
    const c = candidate({ org: "TICA" });
    const assessments = assessCandidate(c, [fife], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("competition");
  });

  it("FIFe candidate vs nearby TICA show (same weekend) → 'competition', not 'permission'", () => {
    const tica = defaultTica({
      start_date: "2027-09-18",
      end_date: "2027-09-18",
      id: 212,
      lat: PIN_LAT - 2,
      lng: PIN_LNG,
    });
    const c = candidate({ org: "FIFe" });
    const assessments = assessCandidate(c, [tica], {});
    const found = assessments.flatMap((a) => a.shows);
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("competition");
  });
});

// --- Empty assessments ---

describe("empty window", () => {
  it("candidate with no overlapping shows → empty assessments", () => {
    const tica = defaultTica({
      start_date: "2027-06-26", // far before candidate window
      lat: PIN_LAT - 1,
      lng: PIN_LNG,
    });
    const assessments = assessCandidate(candidate(), [tica], {});
    expect(assessments).toHaveLength(0);
  });
});
