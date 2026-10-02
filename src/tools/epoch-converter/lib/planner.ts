import { wallClockAt } from '@/shared/lib/time';

export interface PlannerCell {
  zone: string;
  localHour: number;
  localMinute: number;
  working: boolean;
}

export interface PlannerRow {
  /** The UTC hour (0 to 23) of the planned UTC day. */
  hourUTC: number;
  epochMs: number;
  cells: PlannerCell[];
}

/**
 * The meeting planner grid (spec §9.6): for each UTC hour of `dateISO`
 * (a UTC calendar date), the local time in every zone and whether it falls
 * in working hours [start, end).
 */
export function planDay(
  dateISO: string,
  zones: string[],
  [start, end]: [number, number] = [9, 17],
): PlannerRow[] {
  const [y, m, d] = dateISO.split('-').map(Number);
  const rows: PlannerRow[] = [];
  for (let h = 0; h < 24; h++) {
    const epochMs = Date.UTC(y, m - 1, d, h);
    rows.push({
      hourUTC: h,
      epochMs,
      cells: zones.map((zone) => {
        const w = wallClockAt(epochMs, zone);
        const t = w.hh + w.mm / 60;
        return {
          zone,
          localHour: w.hh,
          localMinute: w.mm,
          working: t >= start && t < end,
        };
      }),
    });
  }
  return rows;
}

/**
 * The UTC hours where every zone is working; when no hour suits everyone,
 * the hours where the most zones are. Empty when nobody is ever working.
 */
export function bestOverlap(rows: PlannerRow[]): number[] {
  const counts = rows.map((r) => r.cells.filter((c) => c.working).length);
  const best = Math.max(0, ...counts);
  if (best === 0) return [];
  return rows.filter((_, i) => counts[i] === best).map((r) => r.hourUTC);
}
