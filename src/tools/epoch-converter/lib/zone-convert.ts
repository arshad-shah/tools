import { formatIso, wallClockToEpoch, type WallClock } from '@/shared/lib/time';

export interface ZoneConversion {
  epochMs: number;
  /** A notice when the wall-clock time is skipped or repeated by DST. */
  notice: string | null;
  rows: { zone: string; iso: string }[];
}

const p2 = (n: number) => String(n).padStart(2, '0');

/**
 * A wall-clock time in `fromZone` shown in each zone (spec §9.6 zone
 * converter). In a spring-forward gap the time does not exist and is moved
 * forward; in an autumn overlap the earlier of the two instants is used.
 */
export function convertWallClock(
  wall: WallClock,
  fromZone: string,
  zones: string[],
): ZoneConversion {
  const { epochMs, status } = wallClockToEpoch(wall, fromZone);
  const time = `${p2(wall.hh)}:${p2(wall.mm)}`;
  const notice =
    status === 'skipped'
      ? `${time} does not exist in ${fromZone} on that day (the clocks go forward), so it is moved forward by the length of the gap`
      : status === 'ambiguous'
        ? `${time} happens twice in ${fromZone} on that day (the clocks go back), so the first one is used`
        : null;
  return {
    epochMs,
    notice,
    rows: zones.map((zone) => ({ zone, iso: formatIso(epochMs, zone) })),
  };
}
