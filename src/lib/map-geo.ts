// Approximate a circle of `radiusKm` around `center` as a 64-point polygon,
// adjusting longitude spread for latitude. Good enough for visual feedback.
export function circlePolygon(
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
