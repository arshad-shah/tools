export interface GeoFields {
  lat: string;
  lon: string;
  label: string;
}

export function geoPayload(f: GeoFields): string {
  const base = `geo:${f.lat.trim()},${f.lon.trim()}`;
  return f.label.trim()
    ? `${base}?q=${encodeURIComponent(f.label.trim())}`
    : base;
}

/** Latitude in -90..90 and longitude in -180..180, or why not. */
export function geoProblem(f: GeoFields): string | null {
  const lat = Number(f.lat);
  const lon = Number(f.lon);
  if (f.lat.trim() === '' || !Number.isFinite(lat) || Math.abs(lat) > 90)
    return 'Latitude must be a number from -90 to 90';
  if (f.lon.trim() === '' || !Number.isFinite(lon) || Math.abs(lon) > 180)
    return 'Longitude must be a number from -180 to 180';
  return null;
}
