import type { ZoneInfo } from '@/shared/lib/time';

/** Common names for places whose zone id names another city. */
const ALIASES: Record<string, string[]> = {
  'America/Los_Angeles': ['San Francisco', 'Seattle', 'Pacific Time', 'PT'],
  'America/New_York': ['Washington', 'Boston', 'Eastern Time', 'ET'],
  'America/Chicago': ['Dallas', 'Houston', 'Central Time', 'CT'],
  'America/Denver': ['Mountain Time', 'MT'],
  'America/Toronto': ['Ottawa'],
  'America/Sao_Paulo': ['Rio de Janeiro', 'Brasilia'],
  'Europe/London': ['United Kingdom', 'UK', 'Edinburgh'],
  'Europe/Dublin': ['Ireland', 'Cork'],
  'Europe/Berlin': ['Germany', 'Munich', 'Frankfurt', 'Hamburg'],
  'Europe/Paris': ['France'],
  'Europe/Madrid': ['Spain', 'Barcelona'],
  'Europe/Rome': ['Italy', 'Milan'],
  'Europe/Amsterdam': ['Netherlands'],
  'Europe/Zurich': ['Switzerland', 'Geneva'],
  'Asia/Kolkata': [
    'India',
    'Mumbai',
    'Bombay',
    'Delhi',
    'Bangalore',
    'Calcutta',
  ],
  'Asia/Shanghai': ['China', 'Beijing', 'Shenzhen'],
  'Asia/Tokyo': ['Japan', 'Osaka'],
  'Asia/Seoul': ['Korea'],
  'Asia/Singapore': ['Singapore'],
  'Asia/Dubai': ['UAE', 'Abu Dhabi'],
  'Asia/Ho_Chi_Minh': ['Saigon', 'Vietnam'],
  'Australia/Sydney': ['Canberra', 'Australia East'],
  'Pacific/Auckland': ['New Zealand', 'Wellington'],
  'Africa/Johannesburg': ['South Africa', 'Cape Town'],
  'Africa/Lagos': ['Nigeria'],
  UTC: ['GMT', 'Coordinated Universal Time', 'Zulu'],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();

/**
 * Zones matching a search (spec §9.6): the id, its city part ("Dublin" for
 * Europe/Dublin) and common aliases ("San Francisco"). Prefix matches come
 * before other matches; at most `limit` results.
 */
export function searchZones(
  query: string,
  zones: ZoneInfo[],
  limit = 12,
): ZoneInfo[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { zone: ZoneInfo; score: number }[] = [];
  for (const zone of zones) {
    const city = zone.id.split('/').pop() ?? zone.id;
    const names = [city, zone.id, ...(ALIASES[zone.id] ?? [])].map(norm);
    let score = -1;
    for (const n of names) {
      if (n === q) score = Math.max(score, 3);
      else if (n.startsWith(q)) score = Math.max(score, 2);
      else if (n.includes(q)) score = Math.max(score, 1);
    }
    if (score >= 0) scored.push({ zone, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.zone.id.localeCompare(b.zone.id))
    .slice(0, limit)
    .map((s) => s.zone);
}

/** Moves the item at `from` by `delta` (Alt+Arrow reorder). */
export function moveItem<T>(list: T[], from: number, delta: number): T[] {
  const to = from + delta;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length)
    return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
