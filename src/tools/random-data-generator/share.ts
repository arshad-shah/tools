import {
  MOCK_LOCALES,
  parseMockSchema,
  type MockLocale,
  type MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { decodeShare } from '@/shared/lib/share-state';
import { MAX_COUNT } from './lib/engine';

/** What a share link carries: the recipe, never the generated data. */
export interface MockShare {
  v: 1;
  schema: MockSchema;
  seed: string;
  count: number;
  locale: MockLocale;
}

export const MOCK_SHARE_VERSION = 1;
const SEED_MAX = 200;

/** The validator for useShareableState: a MockShare, or null. */
export function parseMockShare(raw: unknown): MockShare | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.seed !== 'string' || o.seed.length > SEED_MAX) return null;
  if (
    typeof o.count !== 'number' ||
    !Number.isInteger(o.count) ||
    o.count < 1 ||
    o.count > MAX_COUNT
  )
    return null;
  if (!(MOCK_LOCALES as readonly unknown[]).includes(o.locale)) return null;
  try {
    return {
      v: 1,
      schema: parseMockSchema(o.schema),
      seed: o.seed,
      count: o.count,
      locale: o.locale as MockLocale,
    };
  } catch {
    return null;
  }
}

/**
 * The share state in the current URL, read once for initial state (the
 * hook strips the fragment and reports damaged links).
 */
export function readSharedLink(): MockShare | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith('s=')) return null;
  try {
    const { version, state } = decodeShare(hash);
    return version > MOCK_SHARE_VERSION ? null : parseMockShare(state);
  } catch {
    return null;
  }
}
