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
    read: (raw) => {
      const out: Partial<CalculatorPersisted> = {};
      if (raw.calcHistory !== null)
        out.history = JSON.parse(raw.calcHistory) as CalculationHistoryItem[];
      if (raw.savedCalculations !== null)
        out.saved = JSON.parse(raw.savedCalculations) as SavedCalculation[];
      if (raw.memories !== null)
        out.memories = JSON.parse(raw.memories) as MemoryRegister[];
      return Object.keys(out).length > 0 ? out : null;
    },
  },
});
