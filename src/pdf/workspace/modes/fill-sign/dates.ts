/** DD/MM/YYYY from an ISO date; '' for anything else. */
export const isoToDisplay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
export const displayToIso = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

/** Today's calendar date on this device, YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The user's locale for the date line (the browser's, else English). */
export function userLocale(): string {
  const l = typeof navigator !== 'undefined' ? navigator.language : '';
  try {
    return new Intl.DateTimeFormat(l || 'en').resolvedOptions().locale;
  } catch {
    return 'en';
  }
}
