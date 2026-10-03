export function coordinates(lat?: number | null, lng?: number | null): [number, number] | null {
  return typeof lat === 'number' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? [lat, lng]
    : null;
}
