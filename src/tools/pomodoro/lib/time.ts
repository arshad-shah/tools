export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MS_PER_DAY = 86_400_000;

/** Local calendar date as a whole day number (DST-proof). */
const dayNumber = (t: number): number => {
  const d = new Date(t);
  return Math.round(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY,
  );
};

/** Calendar days from `a` to `b` in local time (negative if `b` is earlier). */
export const daysBetween = (a: number, b: number): number =>
  dayNumber(b) - dayNumber(a);

/** Day number of the Monday that starts `t`'s week. */
const weekStart = (t: number): number =>
  dayNumber(t) - ((new Date(t).getDay() + 6) % 7);

/** True when both timestamps fall in the same Monday-based local week. */
export const isSameWeek = (a: number, b: number): boolean =>
  weekStart(a) === weekStart(b);

/** True when both timestamps fall on the same local calendar day. */
export const isSameDay = (a: number, b: number): boolean => {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
};
