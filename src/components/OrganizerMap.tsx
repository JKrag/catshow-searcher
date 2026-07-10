"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Show } from "@/lib/types";
import type { Candidate, WeekendAssessment } from "@/lib/organizer";
import { orgMarkerColor } from "./OrgBadge";
import { circlePolygon } from "@/lib/map-geo";

interface OrganizerMapProps {
  shows: Show[]; // all shows in the fetched window, for markers
  candidate: Candidate; // { lat, lng, from, to, org }
  onCandidateMove: (lat: number, lng: number) => void;
  selectedWeekend: string | null;
  selectedWeekendAssessment: WeekendAssessment | null; // assessment for selectedWeekend, or null
}

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const CANDIDATE_RADIUS_SOURCE_ID = "candidate-radius";
const CANDIDATE_RADIUS_FILL_LAYER = "candidate-radius-fill";
const CANDIDATE_RADIUS_LINE_LAYER = "candidate-radius-line";

const WEEKEND_RADIUS_SOURCE_ID = "weekend-radius";
const WEEKEND_RADIUS_FILL_LAYER = "weekend-radius-fill";
const WEEKEND_RADIUS_LINE_LAYER = "weekend-radius-line";

function radiusKmForOrg(org: Candidate["org"]): number | null {
  if (org === "FIFe") return 400;
  if (org === "TICA") return 805;
  return null;
}

export function OrganizerMap({
  shows,
  candidate,
  onCandidateMove,
  selectedWeekend,
  selectedWeekendAssessment,
}: OrganizerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const candidateMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onCandidateMoveRef = useRef(onCandidateMove);
  onCandidateMoveRef.current = onCandidateMove;

  const geo = useMemo(
    () => shows.filter((s) => s.lat != null && s.lng != null),
    [shows],
  );

  // Map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [candidate.lng, candidate.lat],
      zoom: 5,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    return () => {
      // Strict Mode (dev) double-invokes this effect, tearing down and
      // rebuilding the map. The candidate marker is otherwise ref-gated
      // (never recreated once set — see the drag effect below) so it must
      // be released here too, or it's left attached to the destroyed map
      // and never reappears on the rebuilt one.
      candidateMarkerRef.current?.remove();
      candidateMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const s of geo) {
      const approximate = s.geo_precision === "city" || s.geo_precision === "country";
      const color = orgMarkerColor(s.source);

      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "50%";
      if (approximate) {
        dot.style.background = "white";
        dot.style.border = `3px solid ${color}`;
        dot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2)";
        dot.style.opacity = "0.9";
      } else {
        dot.style.background = color;
        dot.style.border = "2px solid white";
        dot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
      }

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:inherit;font-size:12px;max-width:240px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="display:inline-block;background:${color};color:white;font-weight:600;padding:1px 6px;border-radius:9999px;font-size:10px">${s.source}</span>
            <strong>${escapeHtml(s.title)}</strong>
          </div>
          <div>${escapeHtml(s.start_date)} → ${escapeHtml(s.end_date)}</div>
          <div style="opacity:0.65">${escapeHtml([s.city, s.country].filter(Boolean).join(", "))}</div>
          ${
            approximate
              ? `<div style="margin-top:2px;color:#b45309;font-size:11px">📍 Approximate — placed at ${
                  s.geo_precision === "city" ? "city" : "country"
                } level (venue address not found)</div>`
              : ""
          }
        </div>`,
      );
      const marker = new maplibregl.Marker({ element: dot, anchor: "center" })
        .setLngLat([s.lng!, s.lat!])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [geo]);

  // Draggable candidate pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!candidateMarkerRef.current) {
      // The root element passed to Marker has its `transform` overwritten on
      // every position update (MapLibre uses it for translate positioning),
      // so the teardrop rotation must live on a nested child instead.
      const el = document.createElement("div");
      el.style.width = "34px";
      el.style.height = "34px";
      el.style.cursor = "grab";
      el.setAttribute("aria-label", "Candidate location — drag to move");

      const pin = document.createElement("div");
      pin.style.width = "100%";
      pin.style.height = "100%";
      pin.style.display = "flex";
      pin.style.alignItems = "center";
      pin.style.justifyContent = "center";
      pin.style.fontSize = "18px";
      pin.style.borderRadius = "50% 50% 50% 0";
      pin.style.transform = "rotate(-45deg)";
      pin.style.background = "#2563eb";
      pin.style.color = "white";
      pin.style.border = "3px solid white";
      pin.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";

      const inner = document.createElement("span");
      inner.style.transform = "rotate(45deg)";
      inner.textContent = "🚩";
      pin.appendChild(inner);
      el.appendChild(pin);

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom", draggable: true })
        .setLngLat([candidate.lng, candidate.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onCandidateMoveRef.current(lngLat.lat, lngLat.lng);
      });
      candidateMarkerRef.current = marker;
    } else {
      candidateMarkerRef.current.setLngLat([candidate.lng, candidate.lat]);
    }
  }, [candidate.lat, candidate.lng]);

  // Radius layers — [experiment]: selection-driven inversion of the blast
  // radius display (design doc docs/plans/organizer-view.md, decision #4).
  // Default = one circle around the candidate pin; when a weekend is
  // selected, invert to show no-go zones around that weekend's own-org
  // shows instead. This UX is provisional pending test-user feedback.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const candidateRadiusKm = radiusKmForOrg(candidate.org);
      const showCandidateCircle = !selectedWeekend && candidateRadiusKm != null;

      const existingCandidateSource = map.getSource(CANDIDATE_RADIUS_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!showCandidateCircle) {
        if (map.getLayer(CANDIDATE_RADIUS_LINE_LAYER)) map.removeLayer(CANDIDATE_RADIUS_LINE_LAYER);
        if (map.getLayer(CANDIDATE_RADIUS_FILL_LAYER)) map.removeLayer(CANDIDATE_RADIUS_FILL_LAYER);
        if (existingCandidateSource) map.removeSource(CANDIDATE_RADIUS_SOURCE_ID);
      } else {
        const data = circlePolygon({ lat: candidate.lat, lng: candidate.lng }, candidateRadiusKm!);
        if (existingCandidateSource) {
          existingCandidateSource.setData(data);
        } else {
          map.addSource(CANDIDATE_RADIUS_SOURCE_ID, { type: "geojson", data });
          map.addLayer({
            id: CANDIDATE_RADIUS_FILL_LAYER,
            type: "fill",
            source: CANDIDATE_RADIUS_SOURCE_ID,
            paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
          });
          map.addLayer({
            id: CANDIDATE_RADIUS_LINE_LAYER,
            type: "line",
            source: CANDIDATE_RADIUS_SOURCE_ID,
            paint: {
              "line-color": "#2563eb",
              "line-width": 2,
              "line-dasharray": [2, 2],
              "line-opacity": 0.8,
            },
          });
        }
      }

      // Weekend no-go circles: one per own-org show in the selected weekend.
      const weekendCircles: GeoJSON.Feature<GeoJSON.Polygon>[] =
        selectedWeekend && selectedWeekendAssessment && candidate.org !== "other"
          ? selectedWeekendAssessment.shows
              .filter(
                (a) =>
                  a.show.source === candidate.org &&
                  a.show.lat != null &&
                  a.show.lng != null,
              )
              .map((a) =>
                circlePolygon(
                  { lat: a.show.lat!, lng: a.show.lng! },
                  radiusKmForOrg(a.show.source)!,
                ),
              )
          : [];

      const existingWeekendSource = map.getSource(WEEKEND_RADIUS_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (weekendCircles.length === 0) {
        if (map.getLayer(WEEKEND_RADIUS_LINE_LAYER)) map.removeLayer(WEEKEND_RADIUS_LINE_LAYER);
        if (map.getLayer(WEEKEND_RADIUS_FILL_LAYER)) map.removeLayer(WEEKEND_RADIUS_FILL_LAYER);
        if (existingWeekendSource) map.removeSource(WEEKEND_RADIUS_SOURCE_ID);
      } else {
        const data: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
          type: "FeatureCollection",
          features: weekendCircles,
        };
        if (existingWeekendSource) {
          existingWeekendSource.setData(data);
        } else {
          map.addSource(WEEKEND_RADIUS_SOURCE_ID, { type: "geojson", data });
          map.addLayer({
            id: WEEKEND_RADIUS_FILL_LAYER,
            type: "fill",
            source: WEEKEND_RADIUS_SOURCE_ID,
            paint: { "fill-color": "#dc2626", "fill-opacity": 0.1 },
          });
          map.addLayer({
            id: WEEKEND_RADIUS_LINE_LAYER,
            type: "line",
            source: WEEKEND_RADIUS_SOURCE_ID,
            paint: {
              "line-color": "#dc2626",
              "line-width": 2,
              "line-dasharray": [2, 2],
              "line-opacity": 0.8,
            },
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [candidate.lat, candidate.lng, candidate.org, selectedWeekend, selectedWeekendAssessment]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[600px] rounded-2xl ring-1 ring-border shadow-sm overflow-hidden"
    />
  );
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
