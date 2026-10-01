import { createToolStore } from '@/shared/state/createToolStore';
import type {
  CalculationHistoryItem,
  MemoryRegister,
  SavedCalculation,
} from '../../types/CalculatorTypes'; // PR C moves this to ./types

export interface CalculatorPersisted {
  history: CalculationHistoryItem[];
  saved: SavedCalculation[];
  memories: MemoryRegister[];
}

/** A value or a React-style updater. */
type Update<T> = T | ((prev: T) => T);

export interface CalculatorPersistActions {
  setHistory(next: Update<CalculationHistoryItem[]>): void;
  setSaved(next: Update<SavedCalculation[]>): void;
  setMemories(next: Update<MemoryRegister[]>): void;
}

function parseArray(raw: string | null, key: string): unknown[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn(`[tool:calculator:legacy] ${key}`, error);
    return null;
  }
}

const isMemoryRegister = (m: unknown): m is MemoryRegister =>
  typeof m === 'object' &&
  m !== null &&
  typeof (m as MemoryRegister).label === 'string' &&
  ((m as MemoryRegister).value === null ||
    typeof (m as MemoryRegister).value === 'number');

const resolve = <T>(next: Update<T>, prev: T): T =>
  typeof next === 'function' ? (next as (p: T) => T)(prev) : next;

/**
 * History, favourites and memory registers. Before store-kit they lived in
 * `calcHistory`, `savedCalculations` and `memories`.
 */
export const useCalculatorStore = createToolStore<
  CalculatorPersisted,
  CalculatorPersistActions
>({
  toolId: 'calculator',
  initial: {
    history: [],
    saved: [],
    memories: [
      { label: 'M1', value: null },
      { label: 'M2', value: null },
      { label: 'M3', value: null },
    ],
  },
  actions: (set) => ({
    setHistory: (next) => set((s) => ({ history: resolve(next, s.history) })),
    setSaved: (next) => set((s) => ({ saved: resolve(next, s.saved) })),
    setMemories: (next) =>
      set((s) => ({ memories: resolve(next, s.memories) })),
  }),
  legacy: {
    keys: ['calcHistory', 'savedCalculations', 'memories'],
    // Each key is read on its own: one malformed key must not block the
    // others (the import only ever runs once).
    read: (raw) => {
      const out: Partial<CalculatorPersisted> = {};
      const history = parseArray(raw.calcHistory, 'calcHistory');
      if (history) out.history = history as CalculationHistoryItem[];
      const saved = parseArray(raw.savedCalculations, 'savedCalculations');
      if (saved) out.saved = saved as SavedCalculation[];
      const memories = parseArray(raw.memories, 'memories');
      if (memories?.every(isMemoryRegister)) out.memories = memories;
      return Object.keys(out).length > 0 ? out : null;
    },
  },
});
