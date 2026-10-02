export const EPOCH_SHARE_VERSION = 1;

export interface EpochShare {
  /** Epoch milliseconds. */
  instant: number;
  zones: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The shared-link validator (spec §4.2): the instant and the zone list. */
export function parseEpochShare(state: unknown): EpochShare | null {
  if (!isObject(state)) return null;
  const { instant, zones } = state;
  if (
    typeof instant !== 'number' ||
    !Number.isFinite(instant) ||
    Math.abs(instant) > 8.64e15
  )
    return null;
  if (
    !Array.isArray(zones) ||
    zones.length > 50 ||
    !zones.every((z) => typeof z === 'string' && z.length <= 64)
  )
    return null;
  return { instant, zones: zones as string[] };
}
