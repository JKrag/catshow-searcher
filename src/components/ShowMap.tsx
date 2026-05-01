"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ShowWithDistance } from "@/lib/types";
import { orgMarkerColor } from "./OrgBadge";

interface Props {
  shows: ShowWithDistance[];
  home?: { lat: number; lng: number } | null;
  maxDistanceKm?: number | null;
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

const RADIUS_SOURCE_ID = "home-radius";
const RADIUS_FILL_LAYER = "home-radius-fill";
const RADIUS_LINE_LAYER = "home-radius-line";

// Approximate a circle of `radiusKm` around `center` as a 64-point polygon,
// adjusting longitude spread for latitude. Good enough for visual feedback.
function circlePolygon(
  center: { lat: number; lng: number },
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const earth = 6371;
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = (radiusKm / earth) * (180 / Math.PI);
  const dLng = ((radiusKm / earth) * (180 / Math.PI)) / Math.cos(latRad);
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * 2 * Math.PI;
    coords.push([
      center.lng + dLng * Math.cos(t),
      center.lat + dLat * Math.sin(t),
    ]);
  }
  coords.push(coords[0]);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

export function ShowMap({ shows, home, maxDistanceKm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const geo = useMemo(
    () => shows.filter((s) => s.lat != null && s.lng != null),
    [shows],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [10, 50],
      zoom: 3,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    for (const s of geo) {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "4px";
      wrap.style.transform = "translate(0, 0)";

      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "50%";
      dot.style.background = orgMarkerColor(s.source);
      dot.style.border = "2px solid white";
      dot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
      dot.style.flex = "0 0 auto";
      wrap.appendChild(dot);

      if (home && s.distance_km != null) {
        const label = document.createElement("div");
        label.textContent = `${Math.round(s.distance_km)} km`;
        label.style.fontFamily = "var(--font-geist-sans), sans-serif";
        label.style.fontSize = "10px";
        label.style.fontWeight = "600";
        label.style.lineHeight = "1";
        label.style.padding = "2px 5px";
        label.style.borderRadius = "9999px";
        label.style.color = "#111827";
        label.style.background = "rgba(255,255,255,0.92)";
        label.style.boxShadow = "0 1px 2px rgba(0,0,0,0.18)";
        label.style.whiteSpace = "nowrap";
        label.style.fontVariantNumeric = "tabular-nums";
        label.style.pointerEvents = "none";
        wrap.appendChild(label);
      }

      const distLine =
        home && s.distance_km != null
          ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;color:#16a34a;font-weight:600">
              <span aria-hidden>🚗</span>
              <span class="tabular-nums">${Math.round(s.distance_km)} km${
                s.duration_min != null
                  ? ` &middot; ${formatDuration(s.duration_min)}`
                  : ""
              }</span>
            </div>`
          : "";
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:sans-serif;font-size:12px;max-width:240px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="display:inline-block;background:${orgMarkerColor(s.source)};color:white;font-weight:600;padding:1px 6px;border-radius:9999px;font-size:10px">${s.source}</span>
            <strong>${escapeHtml(s.title)}</strong>
          </div>
          <div>${escapeHtml(s.start_date)} → ${escapeHtml(s.end_date)}</div>
          <div style="color:#666">${escapeHtml([s.city, s.country].filter(Boolean).join(", "))}</div>
          ${distLine}
          ${s.url ? `<div style="margin-top:4px"><a href="${s.url}" target="_blank" rel="noopener">Details ↗</a></div>` : ""}
        </div>`,
      );
      const marker = new maplibregl.Marker({ element: wrap, anchor: "left" })
        .setLngLat([s.lng!, s.lat!])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([s.lng!, s.lat!]);
      hasBounds = true;
    }

    if (home) {
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "16px";
      el.style.borderRadius = "9999px";
      el.style.background = "#16a34a";
      el.style.color = "white";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)";
      el.style.cursor = "pointer";
      el.textContent = "🏠";
      el.setAttribute("aria-label", "Home");
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([home.lng, home.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Home"))
        .addTo(map);
      markersRef.current.push(m);
      bounds.extend([home.lng, home.lat]);
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 400 });
    }
  }, [geo, home]);

  // Radius circle around home
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const existing = map.getSource(RADIUS_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;

      if (!home || !maxDistanceKm) {
        if (map.getLayer(RADIUS_LINE_LAYER)) map.removeLayer(RADIUS_LINE_LAYER);
        if (map.getLayer(RADIUS_FILL_LAYER)) map.removeLayer(RADIUS_FILL_LAYER);
        if (existing) map.removeSource(RADIUS_SOURCE_ID);
        return;
      }

      const data = circlePolygon(home, maxDistanceKm);
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(RADIUS_SOURCE_ID, { type: "geojson", data });
        map.addLayer({
          id: RADIUS_FILL_LAYER,
          type: "fill",
          source: RADIUS_SOURCE_ID,
          paint: {
            "fill-color": "#16a34a",
            "fill-opacity": 0.08,
          },
        });
        map.addLayer({
          id: RADIUS_LINE_LAYER,
          type: "line",
          source: RADIUS_SOURCE_ID,
          paint: {
            "line-color": "#16a34a",
            "line-width": 2,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [home, maxDistanceKm]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full h-[600px] rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm overflow-hidden"
      />
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1 flex-wrap gap-2">
        <span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
            {geo.length}
          </span>{" "}
          of <span className="tabular-nums">{shows.length}</span> shows have a
          location.
          {home && maxDistanceKm ? (
            <>
              {" "}
              · radius{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                {maxDistanceKm} km
              </span>
            </>
          ) : null}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
            FIFe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
            TICA
          </span>
          {home && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600 ring-2 ring-white" />
              Home
            </span>
          )}
        </span>
      </div>
    </div>
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

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
