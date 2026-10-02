/** One day of the session log: counts and durations only, never task text. */
export type DayLog = {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  workSessions: number;
  workMinutes: number;
  breaks: number;
};

export const HISTORY_DAYS = 365;

/** The local calendar date of an instant as `YYYY-MM-DD`. */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/**
 * Adds one finished session to the per-day log (spec §8.6): work adds a
 * session and its minutes, a break adds a break. Days stay in date order
 * and only the newest `cap` days are kept.
 */
export function recordSession(
  history: DayLog[],
  {
    date,
    kind,
    minutes,
  }: { date: string; kind: 'work' | 'break'; minutes: number },
  cap = HISTORY_DAYS,
): DayLog[] {
  const existing = history.find((d) => d.date === date);
  const base: DayLog = existing ?? {
    date,
    workSessions: 0,
    workMinutes: 0,
    breaks: 0,
  };
  const day: DayLog =
    kind === 'work'
      ? {
          ...base,
          workSessions: base.workSessions + 1,
          workMinutes: base.workMinutes + minutes,
        }
      : { ...base, breaks: base.breaks + 1 };
  const next = [...history.filter((d) => d.date !== date), day].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  return next.slice(Math.max(0, next.length - cap));
}

/** The log as CSV, one row per day, oldest first. */
export function historyToCsv(history: DayLog[]): string {
  const rows = history.map(
    (d) => `${d.date},${d.workSessions},${d.workMinutes},${d.breaks}`,
  );
  return ['date,work_sessions,work_minutes,breaks', ...rows].join('\n') + '\n';
}

/**
 * Work sessions per day for the `weeks` weeks ending on `today`'s week
 * (Monday first), oldest first: the 12-week heatmap's cells.
 */
export function weeksGrid(
  history: DayLog[],
  today: number,
  weeks = 12,
): { date: string; workSessions: number }[][] {
  const byDate = new Map(history.map((d) => [d.date, d.workSessions]));
  const end = new Date(today);
  end.setHours(12, 0, 0, 0);
  const monday = new Date(end);
  monday.setDate(end.getDate() - ((end.getDay() + 6) % 7));
  const grid: { date: string; workSessions: number }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const week: { date: string; workSessions: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() - w * 7 + d);
      const date = localDate(day.getTime());
      week.push({ date, workSessions: byDate.get(date) ?? 0 });
    }
    grid.push(week);
  }
  return grid;
}

/** Work sessions for each of the `days` days ending on `today`, oldest first. */
export function lastDays(
  history: DayLog[],
  today: number,
  days = 7,
): { date: string; workSessions: number }[] {
  const byDate = new Map(history.map((d) => [d.date, d.workSessions]));
  const end = new Date(today);
  end.setHours(12, 0, 0, 0);
  const out: { date: string; workSessions: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end);
    day.setDate(end.getDate() - i);
    const date = localDate(day.getTime());
    out.push({ date, workSessions: byDate.get(date) ?? 0 });
  }
  return out;
}
