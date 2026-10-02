import { createToolSettings } from '@/shared/lib/tool-settings';

export type CalculatorMode =
  | 'standard'
  | 'scientific'
  | 'programmer'
  | 'grapher';

/** One evaluated line: `at` is an ISO time, or the old store's time text. */
export type HistoryEntry = { expression: string; result: string; at: string };

export type MemoryRegister = { label: string; value: number | null };

export type CalculatorSettings = {
  mode: CalculatorMode;
  angle: 'deg' | 'rad';
  /** Significant digits, 4 to 64. */
  precision: number;
  bigNumber: boolean;
  thousands: boolean;
  /** Scientific notation from 10^sciAbove. */
  sciAbove: number;
  wordBits: number;
  signed: boolean;
  /**
   * History, favourites and memories are the calculator's long-standing
   * saved features (users expect them back, spec §8.5), so they persist
   * like settings; the data-never-persisted guard allows them by name.
   */
  history: HistoryEntry[];
  saved: HistoryEntry[];
  memories: MemoryRegister[];
};

export const HISTORY_CAP = 500;

export const CALCULATOR_DEFAULTS: CalculatorSettings = {
  mode: 'standard',
  angle: 'deg',
  precision: 14,
  bigNumber: false,
  thousands: false,
  sciAbove: 21,
  wordBits: 32,
  signed: true,
  history: [],
  saved: [],
  memories: [
    { label: 'M1', value: null },
    { label: 'M2', value: null },
    { label: 'M3', value: null },
  ],
};

const STORE_KEY = 'kit:store:tool:calculator';
const LEGACY_KEYS = ['calcHistory', 'savedCalculations', 'memories'] as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** "12 + 3 = 15" (the old tape format) split at its last "=". */
function splitCalculation(text: string): {
  expression: string;
  result: string;
} {
  const at = text.lastIndexOf('=');
  if (at < 0) return { expression: text.trim(), result: '' };
  return {
    expression: text.slice(0, at).trim(),
    result: text.slice(at + 1).trim(),
  };
}

function toEntry(item: unknown): HistoryEntry | null {
  if (typeof item === 'string') return { ...splitCalculation(item), at: '' };
  if (isObject(item) && typeof item.calculation === 'string')
    return {
      ...splitCalculation(item.calculation),
      at: typeof item.timestamp === 'string' ? item.timestamp : '',
    };
  return null;
}

const entries = (v: unknown): HistoryEntry[] =>
  Array.isArray(v)
    ? v.map(toEntry).filter((e): e is HistoryEntry => e !== null)
    : [];

const isMemory = (m: unknown): m is MemoryRegister =>
  isObject(m) &&
  typeof m.label === 'string' &&
  (m.value === null || typeof m.value === 'number');

/**
 * The store-kit calculator store (version 1: `history`, `saved`,
 * `memories` in the old shapes) to the current settings, keeping the
 * user's history, favourites and memory registers.
 */
export function migrateCalculator(
  old: unknown,
  fromVersion: number,
): CalculatorSettings {
  const state = isObject(old) ? old : {};
  if (fromVersion >= 2) return { ...CALCULATOR_DEFAULTS, ...state };
  const memories =
    Array.isArray(state.memories) && state.memories.every(isMemory)
      ? state.memories
      : CALCULATOR_DEFAULTS.memories;
  return {
    ...CALCULATOR_DEFAULTS,
    history: entries(state.history).slice(-HISTORY_CAP),
    saved: entries(state.saved),
    memories,
  };
}

/**
 * Before store-kit the calculator used three loose keys. If they are still
 * here and the store is not, they become a version-0 envelope that
 * `migrateCalculator` reads, then the loose keys go (one malformed key does
 * not block the others).
 */
export function importLegacyKeys(storage: Storage = localStorage): void {
  try {
    if (storage.getItem(STORE_KEY) !== null) return;
    const state: Record<string, unknown> = {};
    for (const key of LEGACY_KEYS) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed))
          state[
            key === 'calcHistory'
              ? 'history'
              : key === 'savedCalculations'
                ? 'saved'
                : 'memories'
          ] = parsed;
      } catch {
        // Unreadable legacy value: skipped, the rest still import.
      }
    }
    if (Object.keys(state).length === 0) return;
    storage.setItem(STORE_KEY, JSON.stringify({ state, version: 0 }));
    LEGACY_KEYS.forEach((k) => storage.removeItem(k));
  } catch {
    // Storage blocked: start from defaults.
  }
}

importLegacyKeys();

/** Calculator settings, history, favourites and memories (spec §8.5). */
export const calculatorSettings = createToolSettings(
  'calculator',
  CALCULATOR_DEFAULTS,
  { version: 2, migrate: migrateCalculator },
);
