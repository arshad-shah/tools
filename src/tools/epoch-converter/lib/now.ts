import { formatIso } from '@/shared/lib/time';

/** The rows the live clock shows for an instant (spec §9.6 Now). */
export function nowRows(ms: number, zone: string) {
  const big = BigInt(Math.trunc(ms));
  return [
    { label: 'Unix seconds', value: String(Math.floor(ms / 1000)) },
    { label: 'Unix milliseconds', value: big.toString() },
    { label: 'Unix microseconds', value: (big * 1000n).toString() },
    { label: 'Unix nanoseconds', value: (big * 1_000_000n).toString() },
    { label: 'ISO 8601 (UTC)', value: formatIso(ms) },
    { label: `Local (${zone})`, value: formatIso(ms, zone) },
  ];
}
