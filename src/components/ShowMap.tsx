"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Show } from "@/lib/types";
import { orgMarkerColor } from "./OrgBadge";

interface Props {
  shows: Show[];
  home?: { lat: number; lng: number } | null;
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

export function ShowMap({ shows, home }: Props) {
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
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.background = orgMarkerColor(s.source);
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family:sans-serif;font-size:12px;max-width:240px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="display:inline-block;background:${orgMarkerColor(s.source)};color:white;font-weight:600;padding:1px 6px;border-radius:9999px;font-size:10px">${s.source}</span>
            <strong>${escapeHtml(s.title)}</strong>
          </div>
          <div>${escapeHtml(s.start_date)} → ${escapeHtml(s.end_date)}</div>
          <div style="color:#666">${escapeHtml([s.city, s.country].filter(Boolean).join(", "))}</div>
          ${s.url ? `<div style="margin-top:4px"><a href="${s.url}" target="_blank" rel="noopener">Details ↗</a></div>` : ""}
        </div>`,
      );
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lng!, s.lat!])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([s.lng!, s.lat!]);
      hasBounds = true;
    }

    if (home) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = "#16a34a";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.4)";
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([home.lng, home.lat])
        .setPopup(new maplibregl.Popup().setText("Home"))
        .addTo(map);
      markersRef.current.push(m);
      bounds.extend([home.lng, home.lat]);
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 10, duration: 400 });
    }
  }, [geo, home]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full h-[600px] rounded border border-zinc-200 dark:border-zinc-800"
      />
      <div className="text-xs text-zinc-500">
        {geo.length} of {shows.length} shows have a location.
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
